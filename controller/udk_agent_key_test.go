package controller

import (
	"net/http"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// udk: agentopia keys run in the user's group with the most models, and "refresh"
// re-applies that (plus all_models) to a key minted earlier.
func TestUdkAgentKeyBestGroup(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.User{}, &model.Ability{}))
	t.Setenv("OIDC_GROUP_MAPPING", `[{"claim":"GenKI Team","group":"genki"}]`)

	previousGroups := setting.UserUsableGroups2JSONString()
	previousRatios, err := common.Marshal(ratio_setting.GetGroupRatioCopy())
	require.NoError(t, err)
	// "us" may be picked by everyone but has no ratio, "hidden" has a ratio but is not usable
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default","eu":"EU","us":"US"}`))
	require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(`{"default":1,"eu":1,"genki":1,"hidden":1}`))
	t.Cleanup(func() {
		require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(previousGroups))
		require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(string(previousRatios)))
	})

	ability := func(group, m string) model.Ability {
		return model.Ability{Group: group, Model: m, ChannelId: 1, Enabled: true}
	}
	require.NoError(t, db.Create(&[]model.Ability{
		ability("genki", "sovereign-medium"), ability("genki", "sovereign-tts"),
		ability("eu", "sovereign-medium"),
		ability("us", "a"), ability("us", "b"), ability("us", "c"), ability("us", "d"),
		ability("hidden", "a"), ability("hidden", "b"), ability("hidden", "c"), ability("hidden", "d"),
	}).Error)

	provision := func(body map[string]any) map[string]any {
		ctx, rec := newAuthenticatedContext(t, http.MethodPost, "/api/udk/agent-key", body, 1)
		UdkProvisionAgentKey(ctx)
		require.Equal(t, http.StatusOK, rec.Code)
		resp := decodeAPIResponse(t, rec)
		require.True(t, resp.Success, resp.Message)
		var data map[string]any
		require.NoError(t, common.Unmarshal(resp.Data, &data))
		return data
	}
	body := map[string]any{
		"oidc_id": "sub-best", "username": "best", "groups": []string{"GenKI Team"},
		"name": "agentopia", "models": []string{"sovereign-medium"}, "remain_quota": 5000,
	}

	// genki (2 models) beats eu (1); us (4) has no ratio, hidden (4) is not usable: own group
	first := provision(body)
	assert.Equal(t, "genki", first["group"])
	assert.Equal(t, "", first["token_group"])
	assert.Equal(t, false, first["all_models"])

	// a usable group with more models wins once it has them; refresh moves the key there
	require.NoError(t, db.Create(&[]model.Ability{ability("eu", "eu-medium"), ability("eu", "eu-high")}).Error)
	again := provision(body)
	assert.Equal(t, false, again["token_updated"])
	assert.Equal(t, "", again["token_group"])

	body["refresh"] = true
	body["all_models"] = true
	body["models"] = []string{}
	moved := provision(body)
	assert.Equal(t, true, moved["token_updated"])
	assert.Equal(t, "eu", moved["token_group"])
	assert.Equal(t, true, moved["all_models"])
	assert.Equal(t, first["key"], moved["key"])

	var token model.Token
	require.NoError(t, db.Where("name = ?", "agentopia").First(&token).Error)
	assert.Equal(t, "eu", token.Group)
	assert.False(t, token.ModelLimitsEnabled)
	assert.Equal(t, "", token.ModelLimits)
	assert.Equal(t, 5000, token.RemainQuota)

	// a new key is minted in the best group straight away
	fresh := provision(map[string]any{
		"oidc_id": "sub-new", "groups": []string{"GenKI Team"}, "name": "agentopia", "all_models": true,
	})
	assert.Equal(t, true, fresh["token_created"])
	assert.Equal(t, "eu", fresh["token_group"])
	assert.Equal(t, true, fresh["all_models"])
}
