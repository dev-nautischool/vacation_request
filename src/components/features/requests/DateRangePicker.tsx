"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"

interface BlockedRange {
  startDate: Date
  endDate: Date
}

interface DateRangePickerProps {
  blockedRanges: BlockedRange[]
  onSelect: (start: Date, end: Date, daysCount: number) => void
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function isBlocked(date: Date, blockedRanges: BlockedRange[]): boolean {
  const t = date.getTime()
  return blockedRanges.some((r) => t >= r.startDate.getTime() && t <= r.endDate.getTime())
}

function isInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false
  const t = date.getTime()
  return t >= start.getTime() && t <= end.getTime()
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function countDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.round(ms / (24 * 60 * 60 * 1000)) + 1
}

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  // getDay() returns 0=Sun; we want 0=Mon
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

interface MonthCalendarProps {
  year: number
  month: number
  startDate: Date | null
  endDate: Date | null
  hoverDate: Date | null
  blockedRanges: BlockedRange[]
  today: Date
  onDayClick: (date: Date) => void
  onDayHover: (date: Date | null) => void
}

function MonthCalendar({
  year,
  month,
  startDate,
  endDate,
  hoverDate,
  blockedRanges,
  today,
  onDayClick,
  onDayHover,
}: MonthCalendarProps) {
  const days = buildCalendarDays(year, month)
  const rangeEnd = endDate ?? hoverDate

  return (
    <div className="min-w-[280px]">
      <p className="text-center font-[var(--font-heading)] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] text-sm mb-3">
        {MONTHS[month]} {year}
      </p>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-[var(--font-heading)] uppercase text-[var(--color-text-body)] pb-1"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />
          const blocked = isBlocked(date, blockedRanges)
          const isPast = date < today && !sameDay(date, today)
          const isDisabled = blocked || isPast
          const isStart = startDate && sameDay(date, startDate)
          const isEnd = rangeEnd && sameDay(date, rangeEnd)
          const inRange = !isStart && !isEnd && startDate && isInRange(date, startDate, rangeEnd)

          let cellCls =
            "h-9 w-full flex items-center justify-center text-sm select-none transition-colors"

          if (isDisabled) {
            cellCls += " opacity-40 cursor-not-allowed text-[var(--color-text-muted)]"
          } else if (isStart || isEnd) {
            cellCls +=
              " bg-[var(--color-primary)] text-white font-bold cursor-pointer"
          } else if (inRange) {
            cellCls +=
              " bg-[var(--color-primary)]/20 text-[var(--color-text-primary)] cursor-pointer"
          } else {
            cellCls +=
              " hover:bg-[var(--color-surface-gray)] text-[var(--color-text-primary)] cursor-pointer"
          }

          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={isDisabled}
              className={cellCls}
              onClick={() => !isDisabled && onDayClick(date)}
              onMouseEnter={() => !isDisabled && onDayHover(date)}
              onMouseLeave={() => onDayHover(null)}
              aria-label={date.toDateString()}
              aria-pressed={isStart || isEnd ? true : undefined}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DateRangePicker({ blockedRanges, onSelect }: DateRangePickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const month2 = viewMonth === 11 ? 0 : viewMonth + 1
  const year2 = viewMonth === 11 ? viewYear + 1 : viewYear

  function handleDayClick(date: Date) {
    if (!startDate || (startDate && endDate)) {
      // Start fresh selection
      setStartDate(date)
      setEndDate(null)
    } else {
      // Set end date
      if (date < startDate) {
        setStartDate(date)
        setEndDate(null)
      } else {
        setEndDate(date)
      }
    }
  }

  const dayCount =
    startDate && endDate ? countDays(startDate, endDate) : startDate && hoverDate && hoverDate >= startDate ? countDays(startDate, hoverDate) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-2 hover:bg-[var(--color-surface-gray)] text-[var(--color-text-primary)]"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm text-[var(--color-text-body)]">Select a date range</span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 hover:bg-[var(--color-surface-gray)] text-[var(--color-text-primary)]"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 justify-center">
        <MonthCalendar
          year={viewYear}
          month={viewMonth}
          startDate={startDate}
          endDate={endDate}
          hoverDate={hoverDate}
          blockedRanges={blockedRanges}
          today={today}
          onDayClick={handleDayClick}
          onDayHover={setHoverDate}
        />
        <MonthCalendar
          year={year2}
          month={month2}
          startDate={startDate}
          endDate={endDate}
          hoverDate={hoverDate}
          blockedRanges={blockedRanges}
          today={today}
          onDayClick={handleDayClick}
          onDayHover={setHoverDate}
        />
      </div>

      {dayCount !== null && (
        <p className="mt-4 text-center text-[var(--color-text-body)] text-sm">
          <span className="font-bold text-[var(--color-text-primary)]">{dayCount}</span>{" "}
          {dayCount === 1 ? "day" : "days"} selected
        </p>
      )}

      {startDate && endDate && (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="primary"
            onClick={() => onSelect(startDate, endDate, countDays(startDate, endDate))}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  )
}
