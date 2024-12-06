import { useMemo, useState } from 'react';
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
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import {
    QueryClient,
    QueryClientProvider,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import useGet from "./useGet";

const API_URL = 'http://localhost:5000/api/products';
const url = new URL(API_URL, window.location.origin);

type Product = {
    product_id: number;
    product_name: string;
    supplier: string;
    item_number: string;
}

type ProductApiResponse = {
    data: Array<Product>;
    meta: {
        totalRowCount: number;
    };
};

const ProductsTable = () => {
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string | undefined>
    >({});

    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<MRT_SortingState>([
        { id: 'product_id', desc: false },
    ]);
    const [pagination, setPagination] = useState<MRT_PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const columns = useMemo<MRT_ColumnDef<Product>[]>(
        () => [
            {
                accessorKey: 'product_id',
                header: 'Код товара',
                enableEditing: false,
            },
            {
                accessorKey: 'product_name',
                header: 'Наименование',
                muiEditTextFieldProps: {
                    required: true,
                    error: !!validationErrors?.product_name,
                    helperText: validationErrors?.product_name,
                    onFocus: () => setValidationErrors({ ...validationErrors, product_name: undefined }),
                },
            },
            {
                accessorKey: 'supplier',
                header: 'Поставщик',
                muiEditTextFieldProps: {
                    required: false,
                    error: !!validationErrors?.supplier,
                    helperText: validationErrors?.supplier,
                    onFocus: () => setValidationErrors({ ...validationErrors, supplier: undefined }),
                },
            },
            {
                accessorKey: 'item_number',
                header: 'Номенклатурный номер',
                muiEditTextFieldProps: {
                    required: true,
                    error: !!validationErrors?.item_number,
                    helperText: validationErrors?.item_number,
                    onFocus: () => setValidationErrors({ ...validationErrors, item_number: undefined }),
                },
            },
        ],
        [validationErrors],
    );

    const {
        data: { data = [], meta } = {},
        isError,
        isRefetching,
        isLoading,
    } = useGet<ProductApiResponse>(url, pagination, columnFilters, globalFilter, sorting);

    const { mutateAsync: createProduct, isPending: isCreatingProduct } =
        useCreateProduct();
    const { mutateAsync: updateProduct, isPending: isUpdatingProduct } =
        useUpdateProduct();
    const { mutateAsync: deleteProduct, isPending: isDeletingProduct } =
        useDeleteProduct();

    const handleCreateProduct: MRT_TableOptions<Product>['onCreatingRowSave'] = async ({
                                                                                           values,
                                                                                           table,
                                                                                       }) => {
        const newValidationErrors = validateProduct(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await createProduct(values);
        table.setCreatingRow(null);
    };

    const handleSaveProduct: MRT_TableOptions<Product>['onEditingRowSave'] = async ({
                                                                                        values,
                                                                                        table,
                                                                                    }) => {
        const newValidationErrors = validateProduct(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await updateProduct(values);
        table.setEditingRow(null);
    };

    const openDeleteConfirmModal = (row: MRT_Row<Product>) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            deleteProduct(row.original.product_id);
        }
    };

    const table = useMaterialReactTable({
        columns,
        data,
        manualFiltering: true,
        manualSorting: true,
        manualPagination: true,
        createDisplayMode: 'row',
        editDisplayMode: 'row',
        enableEditing: true,
        getRowId: (row) => (row.product_id as unknown) as string,
        muiToolbarAlertBannerProps: isError
            ? {
                color: 'error',
                children: 'Error loading data',
            }
            : undefined,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        onCreatingRowCancel: () => setValidationErrors({}),
        onCreatingRowSave: handleCreateProduct,
        onEditingRowCancel: () => setValidationErrors({}),
        onEditingRowSave: handleSaveProduct,
        renderRowActions: ({ row, table }) => (
            <Box sx={{ display: 'flex', gap: '1rem' }}>
                <Tooltip title="Edit">
                    <IconButton onClick={() => table.setEditingRow(row)}>
                        <EditIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                    <IconButton color="error" onClick={() => openDeleteConfirmModal(row)}>
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
            </Box>
        ),
        renderTopToolbarCustomActions: ({ table }) => (
            <Button
                variant="contained"
                onClick={() => {
                    table.setCreatingRow(true);
                }}
            >
                Добавить товар
            </Button>
        ),
        rowCount: meta?.totalRowCount ?? 0,
        state: {
            columnFilters,
            globalFilter,
            isLoading,
            pagination,
            showAlertBanner: isError,
            showProgressBars: isRefetching,
            sorting,
        },
    });

    return <MaterialReactTable table={table} />;
};

function useCreateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newProduct: Omit<Product, 'product_id'>) => {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

function useUpdateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updatedProduct: Product) => {
            const response = await fetch(`${API_URL}/${updatedProduct.product_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProduct),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

function useDeleteProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (product_id: number) => {
            const response = await fetch(`${API_URL}/${product_id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

function validateProduct(product: Partial<Product>) {
    return {
        product_name: !product.product_name ? 'Наименование обязательно' : '',
        supplier: !product.supplier ? 'Поставщик обязателен' : '',
        item_number: !product.item_number ? 'Номенклатурный номер обязателен' : '',
    };
}

const queryClient = new QueryClient();

const ProductsTableWithProviders = () => (
    <QueryClientProvider client={queryClient}>
        <ProductsTable />
    </QueryClientProvider>
);

export default ProductsTableWithProviders;