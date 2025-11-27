import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

const multiSelectVariants = cva(
  "flex items-center rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
  {
    variants: {
      variant: {
        default: "h-10",
        sm: "h-9",
        lg: "h-11",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface MultiSelectProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof multiSelectVariants> {
  placeholder?: string;
  options: { label: string; value: string }[];
  value: string[];
  onValueChange: (value: string[]) => void;
  maxCount?: number;
}

const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      className,
      variant,
      placeholder = "Select options",
      options,
      value = [],
      onValueChange,
      maxCount = 5,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const handleSelect = React.useCallback(
      (selectedValue: string) => {
        if (value.length < maxCount) {
          onValueChange([...value, selectedValue]);
        }
      },
      [value, maxCount, onValueChange]
    );

    const handleRemove = React.useCallback(
      (selectedValue: string) => {
        onValueChange(value.filter((v) => v !== selectedValue));
      },
      [value, onValueChange]
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Backspace" && inputValue === "") {
          handleRemove(value[value.length - 1]);
        }
      },
      [inputValue, value, handleRemove]
    );

    const filteredOptions = options.filter(
      (option) =>
        !value.includes(option.value) &&
        option.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
      <Command
        onKeyDown={handleKeyDown}
        className="overflow-visible bg-transparent"
      >
        <div
          ref={ref}
          className={cn(multiSelectVariants({ variant }), className)}
          onClick={() => inputRef.current?.focus()}
          {...props}
        >
          <div className="flex flex-wrap items-center gap-1 p-1">
            {value.map((v) => {
              const option = options.find((opt) => opt.value === v);
              return (
                <Badge
                  key={v}
                  variant="secondary"
                  className="gap-1 whitespace-nowrap"
                >
                  {option?.label}
                  <button
                    type="button"
                    className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(v);
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              );
            })}
            <CommandPrimitive.Input
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onBlur={() => setOpen(false)}
              onFocus={() => setOpen(true)}
              placeholder={value.length > 0 ? "" : placeholder}
              className="ml-1 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="relative">
          {open && filteredOptions.length > 0 && (
            <div className="absolute top-1 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandGroup className="h-full overflow-auto">
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={() => {
                      handleSelect(option.value);
                      setInputValue("");
                    }}
                    className="cursor-pointer"
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          )}
        </div>
      </Command>
    );
  }
);

MultiSelect.displayName = "MultiSelect";

export { MultiSelect };
