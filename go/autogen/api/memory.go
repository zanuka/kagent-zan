package api

type PineconeMemoryConfig struct {
	APIKey       string   `json:"api_key"`
	IndexHost    string   `json:"index_host"`
	TopK         int      `json:"top_k"`
	Namespace    string   `json:"namespace"`
	RecordFields []string `json:"record_fields"`
}

func (c *PineconeMemoryConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *PineconeMemoryConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}
