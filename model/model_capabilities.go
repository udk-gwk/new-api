package model

import (
	"strings"

	"github.com/QuantumNous/new-api/constant"
)

// ModelCapabilities is what /v1/models tells clients about a chat model, in OpenRouter's
// shape (architecture.input_modalities / output_modalities, supported_parameters). It is
// read from the model metadata's tags, the same vocabulary the official metadata sync
// (basellm/llm-metadata, derived from models.dev) writes: "Vision" = image input,
// "Files" = file input, "Reasoning" = thinking, "Tools" = tool calls. Tags match
// case-insensitively, so operator-written lower-case tags count too.
//
// A model without enabled metadata, or one that serves no chat endpoint (audio, images,
// embeddings, rerank), has no capabilities: clients keep their own defaults for it.
type ModelCapabilities struct {
	InputModalities     []string
	OutputModalities    []string
	SupportedParameters []string
}

var chatEndpointTypes = map[constant.EndpointType]bool{
	constant.EndpointTypeOpenAI:         true,
	constant.EndpointTypeOpenAIResponse: true,
	constant.EndpointTypeAnthropic:      true,
	constant.EndpointTypeGemini:         true,
}

// guarded by modelSupportEndpointsLock, rebuilt with modelSupportEndpointTypes in updatePricing
var modelCapabilities = make(map[string]ModelCapabilities)

// CapabilitiesFromTags derives capabilities from a comma-separated tag string.
func CapabilitiesFromTags(tags string) ModelCapabilities {
	set := make(map[string]bool)
	for _, t := range strings.Split(tags, ",") {
		if t = strings.ToLower(strings.TrimSpace(t)); t != "" {
			set[t] = true
		}
	}
	caps := ModelCapabilities{InputModalities: []string{"text"}, OutputModalities: []string{"text"}}
	if set["vision"] {
		caps.InputModalities = append(caps.InputModalities, "image")
	}
	if set["files"] {
		caps.InputModalities = append(caps.InputModalities, "file")
	}
	if set["reasoning"] {
		caps.SupportedParameters = append(caps.SupportedParameters, "reasoning")
	}
	if set["tools"] {
		caps.SupportedParameters = append(caps.SupportedParameters, "tools")
	}
	return caps
}

func servesChat(endpoints []constant.EndpointType) bool {
	for _, e := range endpoints {
		if chatEndpointTypes[e] {
			return true
		}
	}
	return false
}

// buildModelCapabilities runs inside updatePricing (lock held) after the endpoint types.
func buildModelCapabilities(metaMap map[string]*Model) {
	modelCapabilities = make(map[string]ModelCapabilities)
	for name, meta := range metaMap {
		if meta == nil || meta.Status != 1 || !servesChat(modelSupportEndpointTypes[name]) {
			continue
		}
		modelCapabilities[name] = CapabilitiesFromTags(meta.Tags)
	}
}

// GetModelCapabilities returns the cached capabilities of a model, if its metadata gives any.
func GetModelCapabilities(model string) (ModelCapabilities, bool) {
	modelSupportEndpointsLock.RLock()
	defer modelSupportEndpointsLock.RUnlock()
	caps, ok := modelCapabilities[model]
	return caps, ok
}
