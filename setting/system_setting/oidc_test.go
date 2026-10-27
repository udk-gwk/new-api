package system_setting

import (
	"testing"

	"github.com/QuantumNous/new-api/setting/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOIDCSettings_GetEffectiveDisplayName(t *testing.T) {
	tests := []struct {
		name        string
		displayName string
		want        string
	}{
		{name: "blank falls back to OIDC", displayName: "", want: "OIDC"},
		{name: "custom name is returned verbatim", displayName: "Acme SSO", want: "Acme SSO"},
		{name: "whitespace-only falls back to OIDC", displayName: "   ", want: "OIDC"},
		{name: "surrounding whitespace is trimmed", displayName: "  Acme SSO  ", want: "Acme SSO"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &OIDCSettings{DisplayName: tt.displayName}
			assert.Equal(t, tt.want, s.GetEffectiveDisplayName())
		})
	}
}

func TestOIDCSettings_DisplayNamePersistenceRoundTrip(t *testing.T) {
	settings := &OIDCSettings{DisplayName: "  Acme SSO  "}
	manager := config.NewConfigManager()
	manager.Register("oidc", settings)

	saved := make(map[string]string)
	require.NoError(t, manager.SaveToDB(func(key, value string) error {
		saved[key] = value
		return nil
	}))
	require.Equal(t, "  Acme SSO  ", saved["oidc.display_name"])

	settings.DisplayName = ""
	require.NoError(t, manager.LoadFromDB(saved))
	assert.Equal(t, "  Acme SSO  ", settings.DisplayName)
	assert.Equal(t, "Acme SSO", settings.GetEffectiveDisplayName())
}

func TestOIDCGroupForClaims(t *testing.T) {
	mapping := `[{"claim":"GenKI Team","group":"genki"},{"claim":"Course 3312","group":"eu"}]`
	tests := []struct {
		name    string
		mapping string
		groups  []string
		want    string
	}{
		{name: "no mapping keeps default", mapping: "", groups: []string{"GenKI Team"}, want: ""},
		{name: "no groups keeps default", mapping: mapping, groups: nil, want: ""},
		{name: "unmapped group keeps default", mapping: mapping, groups: []string{"Studis"}, want: ""},
		{name: "single match", mapping: mapping, groups: []string{"Course 3312"}, want: "eu"},
		{name: "first rule wins over claim order", mapping: mapping, groups: []string{"Course 3312", "GenKI Team"}, want: "genki"},
		{name: "claim match is exact", mapping: mapping, groups: []string{"genki team"}, want: ""},
		{name: "broken mapping keeps default", mapping: `{"GenKI Team":"genki"}`, groups: []string{"GenKI Team"}, want: ""},
		{name: "rule without group is skipped", mapping: `[{"claim":"GenKI Team"},{"claim":"GenKI Team","group":"genki"}]`, groups: []string{"GenKI Team"}, want: "genki"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, OIDCGroupForClaims(tt.mapping, tt.groups))
		})
	}
}
