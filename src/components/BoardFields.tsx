import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BOARD_TYPES } from "@/lib/board";

type BoardFieldsProps = {
  boardType: string;
  boardSize: string;
  onTypeChange: (value: string) => void;
  onSizeChange: (value: string) => void;
  typeLabel?: string;
  sizeLabel?: string;
  sizePlaceholder?: string;
};

export function BoardFields({
  boardType,
  boardSize,
  onTypeChange,
  onSizeChange,
  typeLabel = "Tipo de prancha",
  sizeLabel = "Tamanho da prancha",
  sizePlaceholder = `Ex: 6'2" ou 9'0"`,
}: BoardFieldsProps) {
  return (
    <>
      <Field label={typeLabel}>
        <Select value={boardType} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {BOARD_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={sizeLabel}>
        <Input
          value={boardSize}
          onChange={(e) => onSizeChange(e.target.value)}
          placeholder={sizePlaceholder}
        />
      </Field>
    </>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    {children}
  </div>
);
