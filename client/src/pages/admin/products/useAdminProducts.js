import { useEffect, useRef, useState } from "react";
import { listProductsApi } from "../../../services/product.api";

export const useAdminProducts = ({ enabled }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [dataVersion, setDataVersion] = useState(0);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [categoryId, setCategoryId] = useState("");

  const reqSeqRef = useRef(0);
  const lastFetchKeyRef = useRef("");
  const prevSearchRef = useRef("");
  const prevCategoryRef = useRef("");

  const refresh = async ({
    search,
    categoryId: nextCategoryId,
    page: nextPage,
    limit: nextLimit,
  } = {}) => {
    const seq = (reqSeqRef.current += 1);
    setLoading(true);
    setError("");

    try {
      const res = await listProductsApi({
        search: search ?? debouncedSearch,
        categoryId: nextCategoryId ?? categoryId,
        page: nextPage ?? page,
        limit: nextLimit ?? limit,
        includeHidden: true,
      });

      if (seq !== reqSeqRef.current) return;

      setItems(res?.items || []);
      setTotal(res?.meta?.total || 0);
      setTotalPages(res?.meta?.totalPages || 1);
      setPage(res?.meta?.page || (nextPage ?? page) || 1);
      setLimit(res?.meta?.limit || (nextLimit ?? limit) || 10);
      setDataVersion((v) => v + 1);
    } catch (err) {
      if (seq !== reqSeqRef.current) return;
      setError(err?.message || "Không thể tải danh sách sản phẩm");
    } finally {
      if (seq !== reqSeqRef.current) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      const next = (searchInput || "").trim();
      setDebouncedSearch((prev) => (prev === next ? prev : next));
    }, 450);

    return () => clearTimeout(timer);
  }, [enabled, searchInput]);

  useEffect(() => {
    if (!enabled) return;

    const searchChanged = prevSearchRef.current !== debouncedSearch;
    const categoryChanged = prevCategoryRef.current !== categoryId;
    const pageToFetch = searchChanged || categoryChanged ? 1 : page;

    const key = `${debouncedSearch}|${categoryId}|${pageToFetch}|${limit}`;
    if (key === lastFetchKeyRef.current) return;
    lastFetchKeyRef.current = key;

    if (searchChanged) {
      prevSearchRef.current = debouncedSearch;
    }

    if (categoryChanged) {
      prevCategoryRef.current = categoryId;
    }

    refresh({ search: debouncedSearch, categoryId, page: pageToFetch, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedSearch, categoryId, page, limit]);

  const reset = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCategoryId("");
    setPage(1);
    prevSearchRef.current = "";
    prevCategoryRef.current = "";
    lastFetchKeyRef.current = "";
  };

  const patchItem = (id, patch) => {
    const targetId = String(id);
    setItems((prev) =>
      (prev || []).map((it) => {
        if (String(it?.id) !== targetId) return it;
        const nextPatch = typeof patch === "function" ? patch(it) : patch;
        return { ...it, ...(nextPatch || {}) };
      }),
    );
  };

  return {
    loading,
    error,
    dataVersion,
    items,
    page,
    limit,
    total,
    totalPages,
    searchInput,
    setSearchInput,
    categoryId,
    setCategoryId,
    setPage,
    setLimit,
    refresh,
    patchItem,
    reset,
  };
};
