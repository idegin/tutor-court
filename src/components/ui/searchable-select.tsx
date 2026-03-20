import React from 'react'
import Select, { Props as SelectProps } from 'react-select'

// We export the classNames so other wrappers (like react-timezone-select) can match the exact styling.
export const getSelectClassNames = (error?: boolean) => ({
    control: (state: any) =>
        `flex w-full items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm ring-offset-background transition-colors cursor-pointer ${state.isDisabled ? 'cursor-not-allowed opacity-50' : ''
        } ${error
            ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500'
            : 'border-slate-300 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'
        }`,
    input: () => "text-sm min-h-8",
    singleValue: () => "text-sm text-slate-900 dark:text-slate-100",
    menu: () => "mt-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-md overflow-hidden z-50",
    menuList: () => "max-h-[300px] overflow-y-auto p-1",
    option: (state: any) =>
        `cursor-pointer rounded-md px-3 py-2 text-sm transition-colors ${state.isSelected
            ? 'bg-emerald-500 text-white font-medium hover:bg-emerald-600 hover:text-white'
            : state.isFocused
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                : 'text-slate-700 dark:text-slate-300'
        }`,
    placeholder: () => "text-slate-500 text-sm",
    valueContainer: () => "gap-1",
    indicatorsContainer: () => "text-slate-400 gap-1",
    clearIndicator: () => "cursor-pointer hover:text-slate-600",
    dropdownIndicator: () => "cursor-pointer hover:text-slate-600",
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
