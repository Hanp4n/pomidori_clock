import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { IconChevronDown } from '@tabler/icons-react'

export type Tag = {
  id: string
  name: string
  color: string
}

type TagSelectorProps = {
  id?: string
  tags: Tag[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
}

// ponytail: presentational only. Persisting TaskCategory rows is issue #13.
const TagSelector = ({
  id,
  tags,
  selected,
  onChange,
  placeholder = 'Select tags',
}: TagSelectorProps) => {
  const toggle = (tagId: string) => {
    onChange(
      selected.includes(tagId)
        ? selected.filter((t) => t !== tagId)
        : [...selected, tagId]
    )
  }

  const selectedTags = tags.filter((tag) => selected.includes(tag.id))

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-label={placeholder}
          className="flex min-h-8 w-full flex-wrap items-center gap-1 rounded-2xl border border-transparent bg-input/50 px-2.5 py-1 text-sm text-left outline-none transition-[color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {selectedTags.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))
          )}
          <IconChevronDown
            className="ml-auto size-4 shrink-0 text-muted-foreground"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="flex flex-col gap-1">
          {tags.map((tag) => (
            <label
              key={tag.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(tag.id)}
                onCheckedChange={() => toggle(tag.id)}
              />
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </label>
          ))}
          {tags.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No tags available.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default TagSelector
