'use client'

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { BreedOption } from '@/features/auth/types/signup'
import { cn } from '@/lib/utils'

interface BreedComboboxProps {
  breeds: BreedOption[]
  value: number | null
  onChange: (breedId: number | null) => void
}

function normalizeBreedName(value: string) {
  return value.trim().toLocaleLowerCase('ko-KR')
}

export function BreedCombobox({
  breeds,
  value,
  onChange,
}: BreedComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const selectedBreed = breeds.find((breed) => breed.id === value) ?? null
  const [query, setQuery] = useState(selectedBreed?.name ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const filteredBreeds = useMemo(() => {
    const normalizedQuery = normalizeBreedName(query)
    if (!normalizedQuery) return breeds

    return breeds.filter((breed) =>
      normalizeBreedName(breed.name).includes(normalizedQuery)
    )
  }, [breeds, query])

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [])

  const selectBreed = (breed: BreedOption) => {
    setQuery(breed.name)
    onChange(breed.id)
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery)
    setIsOpen(true)
    setActiveIndex(0)

    if (value !== null && selectedBreed?.name !== nextQuery) {
      onChange(null)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      if (filteredBreeds.length === 0) return

      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((currentIndex) => {
        if (currentIndex < 0) {
          return direction === 1 ? 0 : filteredBreeds.length - 1
        }
        return (
          (currentIndex + direction + filteredBreeds.length) %
          filteredBreeds.length
        )
      })
      return
    }

    if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      const activeBreed = filteredBreeds[activeIndex]
      if (!activeBreed) return

      event.preventDefault()
      selectBreed(activeBreed)
    }
  }

  const activeBreed = filteredBreeds[activeIndex]

  return (
    <div ref={rootRef} className="relative">
      <Input
        type="text"
        role="combobox"
        aria-label="견종"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-activedescendant={
          isOpen && activeBreed
            ? `${listboxId}-option-${activeBreed.id}`
            : undefined
        }
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => {
          setIsOpen(true)
          setActiveIndex(filteredBreeds.length > 0 ? 0 : -1)
        }}
        onKeyDown={handleKeyDown}
        placeholder="견종 이름을 입력하세요"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="appearance-none pr-10 [-webkit-appearance:none]"
      />
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-gray transition-transform',
          isOpen && 'rotate-180'
        )}
      />

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="견종 검색 결과"
          className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-30 max-h-52 overflow-y-auto overscroll-contain rounded-card border border-border bg-card-surface p-1 shadow-lg"
        >
          {filteredBreeds.length > 0 ? (
            filteredBreeds.map((breed, index) => {
              const isSelected = breed.id === value
              const isActive = index === activeIndex

              return (
                <button
                  key={breed.id}
                  id={`${listboxId}-option-${breed.id}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => selectBreed(breed)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[14px] text-deep-brown outline-none transition-colors',
                    isActive && 'bg-muted',
                    isSelected && 'font-semibold text-sage-green'
                  )}
                >
                  <span>{breed.name}</span>
                  {isSelected && <Check aria-hidden="true" className="h-4 w-4" />}
                </button>
              )
            })
          ) : (
            <p role="status" className="px-3 py-3 text-[13px] text-warm-gray">
              일치하는 견종이 없어요.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
