'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DELIVERY_PLATFORMS } from '@/lib/constants/visit-constants';
import { useState } from 'react';

interface DeliveryPlatformSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DeliveryPlatformSelector({
  value,
  onChange,
}: DeliveryPlatformSelectorProps) {
  const [isOther, setIsOther] = useState(false);
  const [otherValue, setOtherValue] = useState('');

  const handleChange = (newValue: string) => {
    if (newValue === 'OTHER') {
      setIsOther(true);
      onChange(otherValue || '');
    } else {
      setIsOther(false);
      onChange(newValue);
    }
  };

  const handleOtherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtherValue(e.target.value);
    onChange(e.target.value);
  };

  // Determine if current value is from the predefined list
  const isPredefinedValue = DELIVERY_PLATFORMS.includes(value as typeof DELIVERY_PLATFORMS[number]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Delivery Platform/Company *</Label>
      
      <RadioGroup
        value={isPredefinedValue ? value : (isOther || !isPredefinedValue && value ? 'OTHER' : '')}
        onValueChange={handleChange}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
      >
        {DELIVERY_PLATFORMS.map((platform) => (
          <div key={platform} className="flex items-center space-x-2">
            <RadioGroupItem value={platform} id={platform} />
            <Label htmlFor={platform} className="text-sm cursor-pointer">
              {platform}
            </Label>
          </div>
        ))}
        <div className="flex items-center space-x-2 col-span-3">
          <RadioGroupItem value="OTHER" id="other" />
          <Label htmlFor="other" className="text-sm cursor-pointer">
            Other
          </Label>
        </div>
      </RadioGroup>

      {(isOther || (!isPredefinedValue && value)) && (
        <Input
          placeholder="Enter platform/company name"
          value={isOther ? otherValue : value}
          onChange={handleOtherInputChange}
          className="mt-2"
        />
      )}
    </div>
  );
}

export default DeliveryPlatformSelector;
