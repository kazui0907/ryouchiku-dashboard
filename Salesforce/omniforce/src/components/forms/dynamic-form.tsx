"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PicklistValue {
  value: string;
  label: string;
  isDefault?: boolean;
}

interface Field {
  id: string;
  apiName: string;
  label: string;
  dataType: string;
  isRequired: boolean;
  isUnique: boolean;
  defaultValue: string | null;
  length: number | null;
  precision: number | null;
  scale: number | null;
  picklistValues: PicklistValue[] | null;
  referenceObjectId: string | null;
  referenceObject?: {
    id: string;
    apiName: string;
    label: string;
  } | null;
  description: string | null;
  helpText: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface DynamicFormProps {
  fields: Field[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export function DynamicForm({
  fields,
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = "保存",
}: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [lookupOptions, setLookupOptions] = useState<Record<string, any[]>>({});

  useEffect(() => {
    // 初期値を設定
    const data: Record<string, any> = {};
    fields.forEach((field) => {
      if (initialData[field.apiName] !== undefined) {
        data[field.apiName] = initialData[field.apiName];
      } else if (field.defaultValue) {
        data[field.apiName] = field.defaultValue;
      } else if (field.dataType === "Checkbox") {
        data[field.apiName] = false;
      }
    });
    setFormData(data);

    // 参照フィールドのオプションを取得
    const lookupFields = fields.filter((f) => f.dataType === "Lookup" && f.referenceObjectId);
    lookupFields.forEach((field) => {
      fetchLookupOptions(field);
    });
  }, [fields, initialData]);

  const fetchLookupOptions = async (field: Field) => {
    if (!field.referenceObjectId) return;
    try {
      const res = await fetch(`/api/records/${field.referenceObjectId}?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setLookupOptions((prev) => ({
          ...prev,
          [field.apiName]: data.data,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch lookup options:", error);
    }
  };

  const handleChange = (apiName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [apiName]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderField = (field: Field) => {
    const value = formData[field.apiName];
    const isRequired = field.isRequired;

    switch (field.dataType) {
      case "Text":
      case "Email":
      case "Phone":
      case "URL":
        return (
          <Input
            id={field.apiName}
            type={field.dataType === "Email" ? "email" : field.dataType === "URL" ? "url" : "text"}
            value={value || ""}
            onChange={(e) => handleChange(field.apiName, e.target.value)}
            maxLength={field.length || undefined}
            required={isRequired}
          />
        );

      case "TextArea":
      case "RichText":
        return (
          <Textarea
            id={field.apiName}
            value={value || ""}
            onChange={(e) => handleChange(field.apiName, e.target.value)}
            maxLength={field.length || undefined}
            rows={4}
            required={isRequired}
          />
        );

      case "Number":
      case "Currency":
      case "Percent":
        return (
          <Input
            id={field.apiName}
            type="number"
            value={value ?? ""}
            onChange={(e) => handleChange(field.apiName, e.target.value ? parseFloat(e.target.value) : null)}
            step={field.scale ? Math.pow(10, -field.scale) : 1}
            required={isRequired}
          />
        );

      case "Date":
        return (
          <Popover>
            <PopoverTrigger
              className={cn(
                "flex h-10 w-full items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(new Date(value), "yyyy年MM月dd日", { locale: ja }) : "日付を選択"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleChange(field.apiName, date?.toISOString().split("T")[0])}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case "DateTime":
        return (
          <Input
            id={field.apiName}
            type="datetime-local"
            value={value ? new Date(value).toISOString().slice(0, 16) : ""}
            onChange={(e) => handleChange(field.apiName, e.target.value ? new Date(e.target.value).toISOString() : null)}
            required={isRequired}
          />
        );

      case "Checkbox":
        return (
          <Switch
            id={field.apiName}
            checked={value || false}
            onCheckedChange={(checked) => handleChange(field.apiName, checked)}
          />
        );

      case "Picklist":
        return (
          <Select
            value={value || ""}
            onValueChange={(val) => handleChange(field.apiName, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {field.picklistValues?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "MultiPicklist":
        // シンプルなチェックボックスリストで実装
        return (
          <div className="space-y-2 border rounded-md p-3">
            {field.picklistValues?.map((option) => {
              const selectedValues = value ? (Array.isArray(value) ? value : value.split(";")) : [];
              const isChecked = selectedValues.includes(option.value);
              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`${field.apiName}-${option.value}`}
                    checked={isChecked}
                    onChange={(e) => {
                      let newValues = [...selectedValues];
                      if (e.target.checked) {
                        newValues.push(option.value);
                      } else {
                        newValues = newValues.filter((v) => v !== option.value);
                      }
                      handleChange(field.apiName, newValues.join(";"));
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor={`${field.apiName}-${option.value}`} className="text-sm">
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
        );

      case "Lookup":
        const options = lookupOptions[field.apiName] || [];
        return (
          <Select
            value={value || ""}
            onValueChange={(val) => handleChange(field.apiName, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`${field.referenceObject?.label || "レコード"}を選択`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((record: any) => (
                <SelectItem key={record.id} value={record.id}>
                  {record.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            id={field.apiName}
            value={value || ""}
            onChange={(e) => handleChange(field.apiName, e.target.value)}
            required={isRequired}
          />
        );
    }
  };

  const activeFields = fields.filter((f) => f.isActive);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {activeFields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.apiName}>
            {field.label}
            {field.isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
          {renderField(field)}
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      ))}

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "保存中..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
        )}
      </div>
    </form>
  );
}
