"use client";

import { getBoardTemplates } from "~/constants/templates";
import { Card } from "~/components/ui/card";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

interface TemplateSelectorProps {
  value: string;
  onChange: (templateName: string) => void;
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  const templates = getBoardTemplates();

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-4">
        Choose a Template
      </label>
      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {templates.map((template) => (
          <div key={template.name} className="flex items-start space-x-3">
            <RadioGroupItem
              value={template.name}
              id={template.name}
              className="mt-1"
            />
            <label htmlFor={template.name} className="flex-1 cursor-pointer">
              <Card className="p-4 hover:shadow-md transition-shadow bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">
                    {template.name}
                  </div>
                  <div className="flex gap-2">
                    {template.columns.map((column) => (
                      <div
                        key={column.name}
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: column.color }}
                        title={column.name}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {template.columns.length} column
                  {template.columns.length !== 1 ? "s" : ""}
                  {" • "}
                  {template.columns.map((c) => c.name).join(", ")}
                </div>
              </Card>
            </label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
