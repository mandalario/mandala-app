import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BOARD_TYPES } from "@/lib/board";
import { boardTypeLabel } from "@/i18n/boardTypes";
import { useTranslation } from "@/i18n/LanguageContext";

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
  typeLabel,
  sizeLabel,
  sizePlaceholder,
}: BoardFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Field label={typeLabel ?? t("board.type")}>
        <Select value={boardType} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder={t("board.selectType")} />
          </SelectTrigger>
          <SelectContent>
            {BOARD_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {boardTypeLabel(value, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={sizeLabel ?? t("board.size")}>
        <Input
          value={boardSize}
          onChange={(e) => onSizeChange(e.target.value)}
          placeholder={sizePlaceholder ?? t("board.sizePlaceholder")}
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
