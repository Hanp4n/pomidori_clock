import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { IconChevronDown, IconPlus, IconSettings, IconTrash } from '@tabler/icons-react'

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
  onCreate?: (name: string, color: string) => void
  onUpdate?: (id: string, name: string, color: string) => void
  onDelete?: (id: string) => void
  placeholder?: string
}

const TagSelector = ({
  id,
  tags,
  selected,
  onChange,
  onCreate,
  onUpdate,
  onDelete,
  placeholder = 'Select tags',
}: TagSelectorProps) => {
  const [openCreate, setOpenCreate] = useState(false)
  const [openManage, setOpenManage] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3A34EB')
  const [edits, setEdits] = useState<Record<string, { name: string; color: string }>>({})

  const toggle = (tagId: string) => {
    onChange(
      selected.includes(tagId)
        ? selected.filter((t) => t !== tagId)
        : [...selected, tagId]
    )
  }

  const handleCreate = () => {
    if (!newName.trim() || !onCreate) return
    onCreate(newName.trim(), newColor)
    setNewName('')
    setNewColor('#3A34EB')
    setOpenCreate(false)
  }

  const openManageDialog = () => {
    const initial: Record<string, { name: string; color: string }> = {}
    for (const tag of tags) initial[tag.id] = { name: tag.name, color: tag.color }
    setEdits(initial)
    setOpenManage(true)
  }

  const updateEdit = (id: string, field: 'name' | 'color', value: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const handleSaveManage = () => {
    if (!onUpdate) return
    for (const tag of tags) {
      const e = edits[tag.id]
      if (e && (e.name !== tag.name || e.color !== tag.color)) {
        onUpdate(tag.id, e.name, e.color)
      }
    }
    setOpenManage(false)
  }

  const handleDeleteCategory = (tagId: string) => {
    if (!onDelete) return
    onDelete(tagId)
    onChange(selected.filter((t) => t !== tagId))
  }

  const selectedTags = tags.filter((tag) => selected.includes(tag.id))
  const canManage = onUpdate || onDelete

  return (
    <>
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
            {(onCreate || canManage) && (
              <>
                <div className="my-1 h-px bg-border" />
                {onCreate && (
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                    onClick={() => setOpenCreate(true)}
                  >
                    <IconPlus className="size-4" />
                    New category
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                    onClick={openManageDialog}
                  >
                    <IconSettings className="size-4" />
                    Manage categories
                  </button>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-category-name">Title</Label>
              <Input
                id="new-category-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-category-color">Color</Label>
              <div className="flex items-center gap-2">
                <label className="relative size-8 shrink-0 cursor-pointer rounded-full" style={{ backgroundColor: newColor }}>
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
                <Input
                  id="new-category-color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openManage} onOpenChange={setOpenManage}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage categories</DialogTitle>
          </DialogHeader>
          {onCreate && (
            <Button
              variant="outline"
              onClick={() => setOpenCreate(true)}
              className="flex items-center gap-2"
            >
              <IconPlus className="size-4" />
              New category
            </Button>
          )}
          <div className="flex flex-col gap-3">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2">
                <Input
                  value={edits[tag.id]?.name ?? tag.name}
                  onChange={(e) => updateEdit(tag.id, 'name', e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center gap-1.5">
                  <label
                    className="relative size-8 shrink-0 cursor-pointer rounded-full"
                    style={{ backgroundColor: edits[tag.id]?.color ?? tag.color }}
                  >
                    <input
                      type="color"
                      value={edits[tag.id]?.color ?? tag.color}
                      onChange={(e) => updateEdit(tag.id, 'color', e.target.value)}
                      className="absolute inset-0 opacity-0"
                    />
                  </label>
                  <Input
                    value={edits[tag.id]?.color ?? tag.color}
                    onChange={(e) => updateEdit(tag.id, 'color', e.target.value)}
                    className="w-24 font-mono"
                  />
                </div>
                {onDelete && (
                  <button
                    type="button"
                    className="size-8 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDeleteCategory(tag.id)}
                  >
                    <IconTrash className="mx-auto size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveManage}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TagSelector
