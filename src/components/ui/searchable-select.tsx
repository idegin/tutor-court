import React from 'react'
import Select, { Props as SelectProps } from 'react-select'

// We export the classNames so other wrappers (like react-timezone-select) can match the exact styling.
export const getSelectClassNames = (error?: boolean) => ({
    control: (state: any) =>
        `flex w-full items-center justify-between rounded-xl border-2 bg-background px-3 py-2 text-sm ring-offset-background transition-colors cursor-pointer ${state.isDisabled ? 'cursor-not-allowed opacity-50' : ''
        } ${error
            ? 'border-tutor-red-500 focus-within:ring-2 focus-within:ring-tutor-red-500'
            : 'border-muted focus-within:border-foreground'
        }`,
    input: () => "text-sm min-h-8 text-foreground",
    singleValue: () => "text-sm text-foreground",
    multiValue: () => "bg-muted rounded-md flex items-center gap-1",
    multiValueLabel: () => "text-sm font-medium px-2 py-1 text-foreground",
    multiValueRemove: () => "px-1 hover:bg-muted-foreground/20 rounded-r-md cursor-pointer text-muted-foreground hover:text-foreground",
    menu: () => "mt-2 rounded-xl border-2 border-muted bg-background overflow-hidden z-50",
    menuList: () => "max-h-[300px] overflow-y-auto p-1",
    option: (state: any) =>
        `cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${state.isSelected
            ? 'bg-primary text-primary-foreground'
            : state.isFocused
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`,
    placeholder: () => "text-muted-foreground font-medium text-sm",
    valueContainer: () => "gap-2",
    indicatorsContainer: () => "text-muted-foreground gap-1",
    clearIndicator: () => "cursor-pointer hover:text-foreground",
    dropdownIndicator: () => "cursor-pointer hover:text-foreground",
})

export interface SearchableSelectProps extends SelectProps {
    error?: boolean;
}

export function SearchableSelect({ error, classNames, ...props }: SearchableSelectProps) {
    return (
        <Select
            unstyled
            classNames={{
                ...getSelectClassNames(error),
                ...classNames
            }}
            {...props}
        />
    )
}
