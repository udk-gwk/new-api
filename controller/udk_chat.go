package controller

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"os"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// GetUdkChatIdentity returns the signed-in user's identity for the UdK GenKI Lab
// Chatwoot widget. The inbox enforces HMAC identity validation, so the email is
// signed here with the inbox's HMAC token (env UDK_CHATWOOT_HMAC_TOKEN) and the
// browser never sees the secret. Without the env var or an email, the widget
// stays anonymous.
func GetUdkChatIdentity(c *gin.Context) {
	secret := os.Getenv("UDK_CHATWOOT_HMAC_TOKEN")
	if secret == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "chat identity not configured"})
		return
	}
	user, err := model.GetSelfUserById(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	email := strings.ToLower(strings.TrimSpace(user.Email))
	if email == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "no email on this account"})
		return
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(email))
	name := user.DisplayName
	if name == "" {
		name = user.Username
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"identifier":      email,
		"identifier_hash": hex.EncodeToString(mac.Sum(nil)),
		"email":           email,
		"name":            name,
	}})
}
