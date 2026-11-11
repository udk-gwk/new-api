package model

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/stretchr/testify/require"
)

func TestCapabilitiesFromTags(t *testing.T) {
	// the official sync's vocabulary
	caps := CapabilitiesFromTags("Reasoning,Tools,Files,Vision,1M")
	require.Equal(t, []string{"text", "image", "file"}, caps.InputModalities)
	require.Equal(t, []string{"text"}, caps.OutputModalities)
	require.Equal(t, []string{"reasoning", "tools"}, caps.SupportedParameters)

	// operator tags: lower case, spaces, unrelated tags ignored
	caps = CapabilitiesFromTags(" sovereign, medium ,vision , reasoning")
	require.Equal(t, []string{"text", "image"}, caps.InputModalities)
	require.Equal(t, []string{"reasoning"}, caps.SupportedParameters)

	// no capability tags: a known text-only chat model
	caps = CapabilitiesFromTags("eu,high")
	require.Equal(t, []string{"text"}, caps.InputModalities)
	require.Empty(t, caps.SupportedParameters)
}

func TestBuildModelCapabilitiesOnlyForEnabledChatModels(t *testing.T) {
	modelSupportEndpointsLock.Lock()
	saved := modelSupportEndpointTypes
	modelSupportEndpointTypes = map[string][]constant.EndpointType{
		"chat":     {constant.EndpointTypeOpenAI},
		"disabled": {constant.EndpointTypeOpenAI},
		"embed":    {constant.EndpointTypeEmbeddings},
	}
	buildModelCapabilities(map[string]*Model{
		"chat":     {ModelName: "chat", Tags: "vision", Status: 1},
		"disabled": {ModelName: "disabled", Tags: "vision", Status: 0},
		"embed":    {ModelName: "embed", Tags: "vision", Status: 1},
	})
	modelSupportEndpointsLock.Unlock()
	t.Cleanup(func() {
		modelSupportEndpointsLock.Lock()
		modelSupportEndpointTypes = saved
		modelCapabilities = make(map[string]ModelCapabilities)
		modelSupportEndpointsLock.Unlock()
	})

	caps, ok := GetModelCapabilities("chat")
	require.True(t, ok)
	require.Contains(t, caps.InputModalities, "image")
	for _, name := range []string{"disabled", "embed", "no-metadata"} {
		_, ok := GetModelCapabilities(name)
		require.False(t, ok, name)
	}
}
