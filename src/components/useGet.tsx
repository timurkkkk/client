
import {
    QueryClient,
    QueryClientProvider,
    useMutation,
    useQuery,
    useQueryClient,
    keepPreviousData, QueryKey,
} from '@tanstack/react-query';
import {
    MaterialReactTable,
    type MRT_ColumnDef,
    type MRT_Row,
    type MRT_TableOptions,
    type MRT_ColumnFiltersState,
    type MRT_PaginationState,
    type MRT_SortingState,
    useMaterialReactTable,
} from 'material-react-table';


function useGet<T1>(url: URL,
                    pagination : MRT_PaginationState,
                    columnFilters: MRT_ColumnFiltersState | null,
                    globalFilter : string | null,
                    sorting: MRT_SortingState | null) {
    return useQuery<T1>({
          queryKey: [
            'table-data',
            columnFilters,
            globalFilter,
            pagination.pageIndex,
            pagination.pageSize,
            sorting,
          ] ,
          queryFn: async () => {
            const fetchURL = url;

            fetchURL.searchParams.set(
                'start',
                `${pagination.pageIndex * pagination.pageSize}`,
            );
            fetchURL.searchParams.set('size', `${pagination.pageSize}`);
            fetchURL.searchParams.set('filters', JSON.stringify(columnFilters ?? []));
            if (globalFilter && globalFilter.trim() !== '') {
              fetchURL.searchParams.set('globalFilter', `%${globalFilter}%`);
            }
            fetchURL.searchParams.set('sorting', JSON.stringify(sorting ?? []));

            const response = await fetch(fetchURL.href);
            console.log('Query try');
            const json = (await response.json()) as T1;
            return json;
          },
          placeholderData: keepPreviousData,
        });
}

export default useGet;