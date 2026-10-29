
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TypeBadge } from '@/lib/types';

export const VIDEO_CATEGORIES = [
  '电视剧',
  '电影',
  '动漫',
  '综艺',
  '短剧',
] as const;

export const DEFAULT_FILTERS = {
  category: '全部分类',
  region: '全部地区',
  language: '全部语言',
  year: '全部年份',
} as const;

export interface VideoFilters {
  category: string;
  region: string;
  language: string;
  year: string;
}

type FilterableVideo = {
  type_name?: string;
  vod_type?: string;
  category?: string;
  region?: string;
  area?: string;
  language?: string;
  lang?: string;
  year?: string | number;
  vod_year?: string | number;
};

function normalizeTypeName(type: string): string {
  return type.replace(/\s+/g, '').trim().normalize('NFC').toLowerCase();
}

function getCategory(video: FilterableVideo): string {
  return video.category?.trim() || video.vod_type?.trim() || video.type_name?.trim() || '';
}

function matches(value: string | number | undefined, selected: string): boolean {
  return selected.startsWith('全部') ||
    String(value ?? '').trim() === selected;
}

export function useTypeBadges<T extends FilterableVideo>(videos: T[]) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<VideoFilters>({
    ...DEFAULT_FILTERS,
  });

  // 固定的视频分类
  const typeBadges = useMemo<TypeBadge[]>(() => {
    const counts = new Map<string, number>();

    videos.forEach(video => {
      const category = getCategory(video);
      if (!category) return;

      const key = normalizeTypeName(category);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return VIDEO_CATEGORIES.map(category => ({
      type: category,
      count: counts.get(normalizeTypeName(category)) ?? 0,
    })) as TypeBadge[];
  }, [videos]);

  // 从视频数据自动收集地区、语言、年份选项
  const filterOptions = useMemo(() => {
    const unique = (values: (string | number | undefined)[]) =>
      Array.from(
        new Set(values.map(v => String(v ?? '').trim()).filter(Boolean))
      ).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    return {
      categories: ['全部分类', ...VIDEO_CATEGORIES],
      regions: ['全部地区', ...unique(videos.map(v => v.region || v.area))],
      languages: ['全部语言', ...unique(videos.map(v => v.language || v.lang))],
      years: ['全部年份', ...unique(videos.map(v => v.year || v.vod_year))],
    };
  }, [videos]);

  const filteredVideos = useMemo(() => {
    const normalizedSelected = new Set(
      Array.from(selectedTypes).map(normalizeTypeName)
    );

    return videos.filter(video => {
      const category = getCategory(video);

      if (
        selectedTypes.size > 0 &&
        !normalizedSelected.has(normalizeTypeName(category))
      ) {
        return false;
      }

      if (!matches(category, filters.category)) return false;
      if (!matches(video.region || video.area, filters.region)) return false;
      if (!matches(video.language || video.lang, filters.language)) return false;
      if (!matches(video.year || video.vod_year, filters.year)) return false;

      return true;
    });
  }, [videos, selectedTypes, filters]);

  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const updateFilter = useCallback(
    (key: keyof VideoFilters, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    setSelectedTypes(new Set());
  }, []);

  useEffect(() => {
    const available = new Set(typeBadges.map(b => b.type));

    setSelectedTypes(prev => {
      const next = new Set(
        Array.from(prev).filter(type => available.has(type))
      );
      return next.size === prev.size ? prev : next;
    });
  }, [typeBadges]);

  return {
    typeBadges,
    selectedTypes,
    filteredVideos,
    toggleType,
    filters,
    updateFilter,
    filterOptions,
    resetFilters,
  };
}
