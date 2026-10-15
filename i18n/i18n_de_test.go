package i18n

import (
	"sort"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
)

func loadLocaleMessages(t *testing.T, locale string) map[string]string {
	t.Helper()

	raw, err := localeFS.ReadFile("locales/" + locale + ".yaml")
	require.NoError(t, err, "locale %s must be embedded", locale)

	messages := make(map[string]string)
	require.NoError(t, yaml.Unmarshal(raw, &messages), "locale %s must be a flat id -> message map", locale)
	require.NotEmpty(t, messages)
	return messages
}

func TestGermanLocaleCoversEveryEnglishMessage(t *testing.T) {
	english := loadLocaleMessages(t, LangEn)
	german := loadLocaleMessages(t, LangDe)

	var missing []string
	for id := range english {
		if _, ok := german[id]; !ok {
			missing = append(missing, id)
		}
	}
	sort.Strings(missing)
	assert.Empty(t, missing, "German messages missing for these ids")

	var extra []string
	for id := range german {
		if _, ok := english[id]; !ok {
			extra = append(extra, id)
		}
	}
	sort.Strings(extra)
	assert.Empty(t, extra, "German messages defined for ids the English locale does not know")
}

func TestGermanLocalePreservesTemplatePlaceholders(t *testing.T) {
	english := loadLocaleMessages(t, LangEn)
	german := loadLocaleMessages(t, LangDe)

	placeholders := func(message string) []string {
		var found []string
		rest := message
		for {
			start := strings.Index(rest, "{{")
			if start < 0 {
				break
			}
			end := strings.Index(rest[start:], "}}")
			if end < 0 {
				break
			}
			found = append(found, rest[start:start+end+2])
			rest = rest[start+end+2:]
		}
		sort.Strings(found)
		return found
	}

	for id, source := range english {
		assert.Equal(t, placeholders(source), placeholders(german[id]),
			"placeholders must match the English message for id %s", id)
	}
}

func TestTranslateReturnsGerman(t *testing.T) {
	require.NoError(t, Init())

	assert.Equal(t, "Ungültiges Token", Translate(LangDe, MsgTokenInvalid))
	assert.Equal(t,
		"Sie haben das Anfragelimit erreicht: höchstens 100 Anfragen in 5 Minuten",
		Translate(LangDe, MsgRateLimitReached, map[string]any{"Max": 100, "Minutes": 5}))
}

func TestNormalizeLangResolvesGermanTags(t *testing.T) {
	for _, tag := range []string{"de", "de-DE", "DE-AT", " de-ch "} {
		assert.Equal(t, LangDe, normalizeLang(tag), "tag %q must resolve to German", tag)
		assert.True(t, IsSupported(tag), "tag %q must be supported", tag)
	}

	assert.Contains(t, SupportedLanguages(), LangDe)
}
