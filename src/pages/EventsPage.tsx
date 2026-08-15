import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  X,
  RefreshCw,
  ArrowUpDown,
  FilterX,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EventCard } from "@/components/events/EventCard";
import { EventCardSkeleton } from "@/components/events/EventCardSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { usePublishedEvents, EventFilters } from "@/lib/queries/events";
import { EVENT_CATEGORIES, EventCategory, EventVenueType } from "@/types/event";

const PAGE_SIZE = 12;

export const EventsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Hydrate Filters from URL query params
  const initialSearch = searchParams.get("q") || "";
  const initialCategories: EventCategory[] = useMemo(() => {
    const raw = searchParams.get("cat");
    if (!raw) return [];
    return raw.split(",").filter((c) => EVENT_CATEGORIES.includes(c as EventCategory)) as EventCategory[];
  }, [searchParams]);
  const initialMode = (searchParams.get("mode") as EventVenueType | "ALL") || "ALL";
  const initialPricing = (searchParams.get("price") as "ALL" | "FREE" | "PAID") || "ALL";
  const initialDatePreset =
    (searchParams.get("date") as "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "UPCOMING") || "ALL";
  const initialSort =
    (searchParams.get("sort") as "START_DATE_ASC" | "START_DATE_DESC" | "POPULARITY" | "PRICE_ASC") ||
    "START_DATE_ASC";

  // Filter States
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>(initialCategories);
  const [venueMode, setVenueMode] = useState<EventVenueType | "ALL">(initialMode);
  const [pricing, setPricing] = useState<"ALL" | "FREE" | "PAID">(initialPricing);
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "UPCOMING">(
    initialDatePreset
  );
  const [sortBy, setSortBy] = useState<"START_DATE_ASC" | "START_DATE_DESC" | "POPULARITY" | "PRICE_ASC">(
    initialSort
  );

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // 2. Debounce Search Input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 3. Sync Filters to URL Query String
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (selectedCategories.length > 0) params.set("cat", selectedCategories.join(","));
    if (venueMode !== "ALL") params.set("mode", venueMode);
    if (pricing !== "ALL") params.set("price", pricing);
    if (datePreset !== "ALL") params.set("date", datePreset);
    if (sortBy !== "START_DATE_ASC") params.set("sort", sortBy);

    setSearchParams(params, { replace: true });
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearch, selectedCategories, venueMode, pricing, datePreset, sortBy, setSearchParams]);

  // 4. Fetch Events from Firestore
  const filters: EventFilters = useMemo(
    () => ({
      searchQuery: debouncedSearch,
      categories: selectedCategories,
      venueType: venueMode,
      pricing,
      datePreset,
      sortBy,
    }),
    [debouncedSearch, selectedCategories, venueMode, pricing, datePreset, sortBy]
  );

  const { data: allEvents, isLoading, isError, refetch } = usePublishedEvents(filters);

  // Active filter count for mobile badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch.trim()) count++;
    count += selectedCategories.length;
    if (venueMode !== "ALL") count++;
    if (pricing !== "ALL") count++;
    if (datePreset !== "ALL") count++;
    if (sortBy !== "START_DATE_ASC") count++;
    return count;
  }, [debouncedSearch, selectedCategories, venueMode, pricing, datePreset, sortBy]);

  const toggleCategory = (cat: EventCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedCategories([]);
    setVenueMode("ALL");
    setPricing("ALL");
    setDatePreset("ALL");
    setSortBy("START_DATE_ASC");
  };

  // 5. Infinite Scroll Sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && allEvents && visibleCount < allEvents.length) {
        setVisibleCount((prev) => prev + PAGE_SIZE);
      }
    },
    [allEvents, visibleCount]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "200px",
      threshold: 0.1,
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  const displayedEvents = useMemo(() => {
    if (!allEvents) return [];
    return allEvents.slice(0, visibleCount);
  }, [allEvents, visibleCount]);

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="B.Tech Campus Events &amp; Workshops"
        description="Browse technical symposiums, hackathons, coding contests, industry guest lectures, and student activities at The Apollo University School of Technology."
        badge={{ text: "School of Technology", variant: "indigo" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 1. Desktop & Mobile Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, topic, or venue..."
                className="pl-9 pr-8 h-10 rounded-xl bg-slate-50/70 border-slate-200 text-xs sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Desktop Quick Selectors */}
            <div className="hidden md:flex items-center gap-2">
              <Select value={venueMode} onValueChange={(v) => setVenueMode(v as EventVenueType | "ALL")}>
                <SelectTrigger className="h-10 text-xs rounded-xl w-[130px]">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Modes</SelectItem>
                  <SelectItem value="ON_CAMPUS">On Campus</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={pricing} onValueChange={(v) => setPricing(v as "ALL" | "FREE" | "PAID")}>
                <SelectTrigger className="h-10 text-xs rounded-xl w-[110px]">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Fees</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={datePreset}
                onValueChange={(v) =>
                  setDatePreset(v as "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "UPCOMING")
                }
              >
                <SelectTrigger className="h-10 text-xs rounded-xl w-[130px]">
                  <SelectValue placeholder="Timeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Any Time</SelectItem>
                  <SelectItem value="TODAY">Today</SelectItem>
                  <SelectItem value="THIS_WEEK">This Week</SelectItem>
                  <SelectItem value="THIS_MONTH">This Month</SelectItem>
                  <SelectItem value="UPCOMING">All Upcoming</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(v) =>
                  setSortBy(v as "START_DATE_ASC" | "START_DATE_DESC" | "POPULARITY" | "PRICE_ASC")
                }
              >
                <SelectTrigger className="h-10 text-xs rounded-xl w-[140px]">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="START_DATE_ASC">Date: Soonest</SelectItem>
                  <SelectItem value="START_DATE_DESC">Date: Latest</SelectItem>
                  <SelectItem value="POPULARITY">Most Popular</SelectItem>
                  <SelectItem value="PRICE_ASC">Price: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Filters Sheet Button */}
            <div className="flex md:hidden items-center justify-between gap-2">
              <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 rounded-xl text-xs gap-2 flex-1">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <Badge variant="indigo" className="ml-1 text-[10px] py-0 px-1.5 h-4">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>

                <SheetContent side="right" className="w-80 p-5 overflow-y-auto">
                  <SheetHeader className="text-left pb-4 border-b">
                    <SheetTitle className="text-base font-bold">Filter Catalog</SheetTitle>
                  </SheetHeader>

                  <div className="space-y-5 py-4 text-xs">
                    <div className="space-y-2">
                      <label className="font-semibold text-slate-900">Categories</label>
                      <div className="flex flex-wrap gap-1.5">
                        {EVENT_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              selectedCategories.includes(cat)
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-semibold text-slate-900">Delivery Mode</label>
                      <Select value={venueMode} onValueChange={(v) => setVenueMode(v as EventVenueType | "ALL")}>
                        <SelectTrigger className="h-9 text-xs rounded-xl w-full">
                          <SelectValue placeholder="Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Modes</SelectItem>
                          <SelectItem value="ON_CAMPUS">On Campus</SelectItem>
                          <SelectItem value="ONLINE">Online</SelectItem>
                          <SelectItem value="HYBRID">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="font-semibold text-slate-900">Pricing</label>
                      <Select value={pricing} onValueChange={(v) => setPricing(v as "ALL" | "FREE" | "PAID")}>
                        <SelectTrigger className="h-9 text-xs rounded-xl w-full">
                          <SelectValue placeholder="Price" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Fees</SelectItem>
                          <SelectItem value="FREE">Free Only</SelectItem>
                          <SelectItem value="PAID">Paid Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="font-semibold text-slate-900">Date Preset</label>
                      <Select
                        value={datePreset}
                        onValueChange={(v) =>
                          setDatePreset(v as "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "UPCOMING")
                        }
                      >
                        <SelectTrigger className="h-9 text-xs rounded-xl w-full">
                          <SelectValue placeholder="Timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Any Time</SelectItem>
                          <SelectItem value="TODAY">Today</SelectItem>
                          <SelectItem value="THIS_WEEK">This Week</SelectItem>
                          <SelectItem value="THIS_MONTH">This Month</SelectItem>
                          <SelectItem value="UPCOMING">All Upcoming</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <SheetFooter className="pt-4 border-t flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => setMobileFilterOpen(false)}
                      className="w-full bg-indigo-600 text-white rounded-xl text-xs"
                    >
                      Show Results
                    </Button>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="w-full text-xs text-rose-600"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Desktop Category Filter Chips */}
          <div className="hidden md:flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">
              Categories:
            </span>
            {EVENT_CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Active Removable Filter Chips Bar */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 font-medium">Active filters:</span>

            {debouncedSearch && (
              <Badge variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1 rounded-lg">
                <span>Keyword: "{debouncedSearch}"</span>
                <button type="button" onClick={() => setSearchQuery("")}>
                  <X className="w-3 h-3 hover:text-slate-900" />
                </button>
              </Badge>
            )}

            {selectedCategories.map((cat) => (
              <Badge key={cat} variant="indigo" className="gap-1 pl-2.5 pr-1.5 py-1 rounded-lg">
                <span>{cat}</span>
                <button type="button" onClick={() => toggleCategory(cat)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}

            {venueMode !== "ALL" && (
              <Badge variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1 rounded-lg">
                <span>Mode: {venueMode}</span>
                <button type="button" onClick={() => setVenueMode("ALL")}>
                  <X className="w-3 h-3 hover:text-slate-900" />
                </button>
              </Badge>
            )}

            {pricing !== "ALL" && (
              <Badge variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1 rounded-lg">
                <span>Pricing: {pricing}</span>
                <button type="button" onClick={() => setPricing("ALL")}>
                  <X className="w-3 h-3 hover:text-slate-900" />
                </button>
              </Badge>
            )}

            {datePreset !== "ALL" && (
              <Badge variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1 rounded-lg">
                <span>Date: {datePreset}</span>
                <button type="button" onClick={() => setDatePreset("ALL")}>
                  <X className="w-3 h-3 hover:text-slate-900" />
                </button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* 3. Event Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center rounded-2xl border border-rose-200 bg-rose-50/50 space-y-3">
            <FilterX className="w-10 h-10 mx-auto text-rose-500 stroke-1" />
            <h3 className="text-base font-bold text-rose-950">Unable to load event catalog</h3>
            <p className="text-xs text-rose-800/80 max-w-sm mx-auto">
              A temporary network or permission error occurred while fetching events.
            </p>
            <Button size="sm" onClick={() => refetch()} className="rounded-xl text-xs gap-1.5 bg-rose-600 text-white">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="p-12 sm:p-16 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No events match your filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your keywords, broadening the category selection, or clearing active filters.
            </p>
            <Button size="sm" variant="outline" onClick={clearAllFilters} className="rounded-xl text-xs">
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Infinite Scroll Sentinel */}
            <div ref={sentinelRef} className="py-4 text-center">
              {allEvents && visibleCount < allEvents.length && (
                <div className="inline-flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Loading more campus events...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default EventsPage;
