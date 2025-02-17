import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Model } from "@/lib/types";

interface ModelSelectionSectionProps {
  allModels: Model[];
  selectedModel: Model;
  setSelectedModel: (model: Model) => void;
  error?: string;
  isSubmitting: boolean;
}

export const ModelSelectionSection = ({ allModels, selectedModel, setSelectedModel, error, isSubmitting }: ModelSelectionSectionProps) => {
  return (
    <>
      <label className="text-sm text-white/70 mb-2 block">Model</label>
      <Select value={selectedModel.id} disabled={isSubmitting} onValueChange={(value) => setSelectedModel(allModels.find((m) => m.id === value) || allModels[0])}>
        <SelectTrigger className={`bg-[#1A1A1A] border-[#3A3A3A] text-white ${error ? "border-red-500" : ""}`}>
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent className="bg-[#2A2A2A] border-[#3A3A3A]">
          {allModels.map((model) => (
            <SelectItem key={model.id} value={model.id} className="text-white hover:bg-[#3A3A3A]">
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </>
  );
};
