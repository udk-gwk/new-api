package controller

// udk: agentopia (one Pi agent per person) provisions a key for the person who
// signed in there, so the agent can start working without a visit to the console.
// The person is identified by the authentik subject, which is this instance's
// oidc_id because both authentik providers use the same sub mode. A missing user
// is created the way an OIDC signup would create it, including the signup group
// from OIDC_GROUP_MAPPING. Root only; the caller is a server, never a browser.

import (
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type udkAgentKeyRequest struct {
	OidcId      string   `json:"oidc_id"`
	Username    string   `json:"username"`
	DisplayName string   `json:"display_name"`
	Email       string   `json:"email"`
	Groups      []string `json:"groups"`
	Name        string   `json:"name"`
	Models      []string `json:"models"`
	RemainQuota int      `json:"remain_quota"`
}

// UdkProvisionAgentKey returns the person's key named req.Name, creating the user
// and the key when they do not exist. Repeated calls return the same key.
func UdkProvisionAgentKey(c *gin.Context) {
	var req udkAgentKeyRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	req.OidcId = strings.TrimSpace(req.OidcId)
	req.Name = strings.TrimSpace(req.Name)
	if req.OidcId == "" || req.Name == "" || len(req.Name) > 50 || len(req.Models) == 0 {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	if req.RemainQuota < 0 || req.RemainQuota > maxTokenQuota() {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}

	user := model.User{OidcId: req.OidcId}
	if err := user.FillUserByOidcId(); err != nil {
		common.ApiError(c, err)
		return
	}
	userCreated := false
	if user.Id == 0 {
		if !common.RegisterEnabled {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "registration is disabled"})
			return
		}
		user = model.User{
			OidcId:      req.OidcId,
			Username:    "oidc_" + strconv.Itoa(model.GetMaxUserId()+1),
			DisplayName: req.DisplayName,
			Role:        common.RoleCommonUser,
			Status:      common.UserStatusEnabled,
		}
		if req.Username != "" && len(req.Username) <= model.UserNameMaxLength {
			if exists, err := model.CheckUserExistOrDeleted(req.Username, ""); err == nil && !exists {
				user.Username = req.Username
			}
		}
		if user.DisplayName == "" {
			user.DisplayName = user.Username
		}
		if req.Email != "" {
			user.Email = model.NormalizeEmail(req.Email)
			if err := model.EnsureEmailAvailable(user.Email, 0); err != nil {
				if errors.Is(err, model.ErrEmailAlreadyTaken) {
					c.JSON(http.StatusConflict, gin.H{"success": false, "message": "email already taken"})
					return
				}
				common.ApiError(c, err)
				return
			}
		}
		if group := system_setting.OIDCGroupForClaims(os.Getenv("OIDC_GROUP_MAPPING"), req.Groups); group != "" && ratio_setting.ContainsGroupRatio(group) {
			user.Group = group
		}
		if err := model.DB.Transaction(func(tx *gorm.DB) error { return user.InsertWithTx(tx, 0) }); err != nil {
			common.ApiError(c, err)
			return
		}
		user.FinalizeOAuthUserCreation(0)
		userCreated = true
	}
	if user.Status != common.UserStatusEnabled {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "user is disabled"})
		return
	}

	var token model.Token
	err := model.DB.Where("user_id = ? AND name = ?", user.Id, req.Name).First(&token).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		common.ApiError(c, err)
		return
	}
	tokenCreated := false
	if errors.Is(err, gorm.ErrRecordNotFound) {
		key, err := common.GenerateKey()
		if err != nil {
			common.ApiErrorT(c, "Failed to generate token")
			return
		}
		now := common.GetTimestamp()
		token = model.Token{
			UserId:              user.Id,
			Name:                req.Name,
			Key:                 key,
			CreatedTime:         now,
			AccessedTime:        now,
			ExpiredTime:         -1,
			RemainQuota:         req.RemainQuota,
			ModelLimitsEnabled:  true,
			ModelLimits:         strings.Join(req.Models, ","),
			AllowUserQuotaQuery: true,
		}
		if err := token.Insert(); err != nil {
			common.ApiError(c, err)
			return
		}
		tokenCreated = true
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"user_id":       user.Id,
			"username":      user.Username,
			"group":         user.Group,
			"token_id":      token.Id,
			"key":           "sk-" + token.Key,
			"user_created":  userCreated,
			"token_created": tokenCreated,
		},
	})
}

// UdkRevokeAgentKey deletes the person's key named name (the agent was deleted).
// The user stays.
func UdkRevokeAgentKey(c *gin.Context) {
	var req udkAgentKeyRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil || strings.TrimSpace(req.OidcId) == "" || strings.TrimSpace(req.Name) == "" {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	user := model.User{OidcId: strings.TrimSpace(req.OidcId)}
	if err := user.FillUserByOidcId(); err != nil {
		common.ApiError(c, err)
		return
	}
	deleted := 0
	if user.Id != 0 {
		var tokens []model.Token
		if err := model.DB.Where("user_id = ? AND name = ?", user.Id, strings.TrimSpace(req.Name)).Find(&tokens).Error; err != nil {
			common.ApiError(c, err)
			return
		}
		for i := range tokens {
			if err := tokens[i].Delete(); err != nil {
				common.ApiError(c, err)
				return
			}
			deleted++
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": gin.H{"deleted": deleted}})
}
