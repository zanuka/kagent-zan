import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Model } from "@/lib/types";

interface ModelSelectionSectionProps {
  allModels: Model[];
  selectedModel: Partial<Model> | null;
  setSelectedModel: (model: Partial<Model>) => void;
  error?: string;
  isSubmitting: boolean;
  onBlur?: () => void;
}

export const ModelSelectionSection = ({ allModels, selectedModel, setSelectedModel, error, isSubmitting, onBlur }: ModelSelectionSectionProps) => {
  return (
    <>
      <label className="text-sm mb-2 block">Model</label>
      <Select 
        value={selectedModel?.name || ""} 
        disabled={isSubmitting || allModels.length === 0} 
        onValueChange={(value) => {
          const model = allModels.find((m) => m.name === value);
          if (model) {
            setSelectedModel(model);
            if (onBlur) {
              onBlur();
            }
          }
        }}
      >
        <SelectTrigger className={`${error ? "border-red-500" : ""}`}>
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {allModels.map((model, idx) => (
            <SelectItem key={`${idx}_${model.name}`} value={model.name}>
              {model.model} ({model.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      {allModels.length === 0 && <p className="text-amber-500 text-sm mt-1">No models available</p>}
    </>
  );
};
