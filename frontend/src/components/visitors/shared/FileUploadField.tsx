'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Upload, X } from 'lucide-react';

interface FileUploadFieldProps {
  label: string;
  description: string;
  accept: string;
  file: File | null;
  fieldName: string;
  onFileChange: (file: File | null) => void;
  error?: string;
}

export function FileUploadField({
  label,
  description,
  accept,
  file,
  fieldName,
  onFileChange,
  error,
}: FileUploadFieldProps) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
        {file ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm truncate max-w-[100px]">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFileChange(null)}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2 text-center">
              {description}
            </p>
            <Input
              type="file"
              accept={accept}
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  onFileChange(selectedFile);
                }
              }}
              className="hidden"
              id={fieldName}
            />
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(fieldName)?.click()}
                className="cursor-pointer"
              >
                Choose File
              </Button>
            </div>
          </>
        )}
      </div>
      {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
  );
}

export default FileUploadField;
