'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { MEETING_SUB_TYPES, MeetingSubTypeKey } from '@/lib/constants/visit-constants';
import { useState } from 'react';

interface MeetingCategorySelectionProps {
  onSelect: (subType: MeetingSubTypeKey) => void;
  onBack: () => void;
}

export function MeetingCategorySelection({
  onSelect,
  onBack,
}: MeetingCategorySelectionProps) {
  const [selectedType, setSelectedType] = useState<MeetingSubTypeKey | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">
          Select Your Visitor Category
        </h2>
        <p className="text-gray-500">
          This helps us serve you better
        </p>
      </div>

      {/* Category Options */}
      <RadioGroup
        value={selectedType || ''}
        onValueChange={(value: string) => setSelectedType(value as MeetingSubTypeKey)}
        className="space-y-3"
      >
        {Object.entries(MEETING_SUB_TYPES).map(([key, type]) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all duration-200 ${
              selectedType === key
                ? 'border-primary ring-2 ring-primary/20'
                : 'hover:border-gray-400'
            }`}
            onClick={() => setSelectedType(key as MeetingSubTypeKey)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <RadioGroupItem value={key} id={key} className="shrink-0" />
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{type.icon}</span>
                <div>
                  <Label
                    htmlFor={key}
                    className="text-base font-medium cursor-pointer"
                  >
                    {type.label}
                  </Label>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!selectedType}>
          Continue
        </Button>
      </div>
    </div>
  );
}

export default MeetingCategorySelection;
