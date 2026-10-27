package system_setting

import (
	"slices"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
)

type OIDCSettings struct {
	Enabled               bool   `json:"enabled"`
	DisplayName           string `json:"display_name"`
	ClientId              string `json:"client_id"`
	ClientSecret          string `json:"client_secret"`
	WellKnown             string `json:"well_known"`
	AuthorizationEndpoint string `json:"authorization_endpoint"`
	TokenEndpoint         string `json:"token_endpoint"`
	UserInfoEndpoint      string `json:"user_info_endpoint"`
}

// OIDCGroupRule maps one entry of the userinfo "groups" claim to a user group.
type OIDCGroupRule struct {
	Claim string `json:"claim"`
	Group string `json:"group"`
}

// 默认配置
var defaultOIDCSettings = OIDCSettings{}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("oidc", &defaultOIDCSettings)
}

func GetOIDCSettings() *OIDCSettings {
	return &defaultOIDCSettings
}

// GetEffectiveDisplayName returns the admin-configured display name, or the
// literal "OIDC" when none has been set. Centralizing this fallback keeps the
// default in one place for both the OAuth provider name and the public
// status payload.
func (s *OIDCSettings) GetEffectiveDisplayName() string {
	if trimmed := strings.TrimSpace(s.DisplayName); trimmed != "" {
		return trimmed
	}
	return "OIDC"
}

// OIDCGroupForClaims returns the group of the first rule in mapping (udk: the
// OIDC_GROUP_MAPPING env var, a JSON list of {"claim","group"} rules), in list
// order, whose claim is one of groups. It returns "" when nothing matches or
// the mapping cannot be read, so the user keeps the default group.
func OIDCGroupForClaims(mapping string, groups []string) string {
	if strings.TrimSpace(mapping) == "" || len(groups) == 0 {
		return ""
	}
	var rules []OIDCGroupRule
	if err := common.UnmarshalJsonStr(mapping, &rules); err != nil {
		common.SysError("[OAuth-OIDC] invalid OIDC_GROUP_MAPPING: " + err.Error())
		return ""
	}
	for _, rule := range rules {
		if rule.Group != "" && slices.Contains(groups, rule.Claim) {
			return rule.Group
		}
	}
	return ""
}
