import React, { useMemo, useState, useEffect } from 'react';
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
import { Box, Button, IconButton, Tooltip, MenuItem } from '@mui/material';
import {
    QueryClient,
    QueryClientProvider,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import useGet from "./useGet";
import ProductsOutcomeForm from "./products-outcome-form";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { format, parse, isValid } from 'date-fns';

const API_URL = 'http://localhost:5000/api/products_outcome';
const WAREHOUSES_API_URL = 'http://localhost:5000/api/warehouses';
const url = new URL(API_URL, window.location.origin);

type ProductsOutcome = {
    id: number;
    outcome_note_id: number;
    warehouse_id: number;
    contractor: string;
    total: number;
    date: string;
}

type Warehouse = {
    warehouse_id: number;
    warehouse_name: string;
}

type ProductsOutcomeApiResponse = {
    data: Array<ProductsOutcome>;
    meta: {
        totalRowCount: number;
    };
};

const ProductsOutcomeTable = () => {
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string | undefined>
    >({});

    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<MRT_SortingState>([
        { id: 'id', desc: false },
    ]);
    const [pagination, setPagination] = useState<MRT_PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

    useEffect(() => {
        const fetchWarehouses = async () => {
            const response = await fetch(WAREHOUSES_API_URL);
            const data = await response.json();
            setWarehouses(data.data);
        };

        fetchWarehouses();
    }, []);

    const columns = useMemo<MRT_ColumnDef<ProductsOutcome>[]>(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                enableEditing: false,
                size: 80,
            },
            {
                accessorKey: 'outcome_note_id',
                header: 'Номер накладной расхода',
                size: 80,
            },
            {
                accessorKey: 'warehouse_id',
                header: 'Склад',
                editVariant: 'select',
                editSelectOptions: warehouses.map(w => ({
                    value: w.warehouse_id,
                    label: w.warehouse_name,
                })),
                Cell: ({ cell }) => warehouses.find(w => w.warehouse_id === cell.getValue<number>())?.warehouse_name ?? 'Unknown',
            },
            {
                accessorKey: 'contractor',
                header: 'Контрагент',
            },
            {
                accessorKey: 'total',
                header: 'Сумма',
                Cell: ({ cell }) => parseFloat(cell.getValue<string>()).toFixed(2),
                muiEditTextFieldProps: {
                    type: 'number',
                    inputProps: { step: 0.01 },
                },
            },
            {
                accessorKey: 'date',
                header: 'Дата',
                Cell: ({ cell }) => {
                    const dateValue = cell.getValue<string>();
                    if (!dateValue) return '';
                    const parsedDate = parse(dateValue, 'yyyy-MM-dd', new Date());
                    return isValid(parsedDate) ? format(parsedDate, 'dd.MM.yyyy') : 'Invalid Date';
                },
                Edit: ({ cell, column, row, table }) => (
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            value={cell.getValue<string>() ? parse(cell.getValue<string>(), 'yyyy-MM-dd', new Date()) : null}
                            onChange={(newValue) => {
                                if (newValue && isValid(newValue)) {
                                    row._valuesCache[column.id] = format(newValue, 'yyyy-MM-dd');
                                } else {
                                    row._valuesCache[column.id] = null;
                                }
                            }}
                            format="dd.MM.yyyy"
                        />
                    </LocalizationProvider>
                ),
            },
        ],
        [warehouses]
    );

    const {
        data: { data = [], meta } = {},
        isError,
        isRefetching,
        isLoading,
    } = useGet<ProductsOutcomeApiResponse>(url, pagination, columnFilters, globalFilter, sorting);

    const { mutateAsync: createProductsOutcome, isPending: isCreatingProductsOutcome } =
        useCreateProductsOutcome();
    const { mutateAsync: updateProductsOutcome, isPending: isUpdatingProductsOutcome } =
        useUpdateProductsOutcome();
    const { mutateAsync: deleteProductsOutcome, isPending: isDeletingProductsOutcome } =
        useDeleteProductsOutcome();

    const handleCreateProductsOutcome: MRT_TableOptions<ProductsOutcome>['onCreatingRowSave'] = async ({
                                                                                                           values,
                                                                                                           table,
                                                                                                       }) => {
        const newValidationErrors = validateProductsOutcome(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await createProductsOutcome(values);
        table.setCreatingRow(null);
    };

    const handleSaveProductsOutcome: MRT_TableOptions<ProductsOutcome>['onEditingRowSave'] = async ({
                                                                                                        values,
                                                                                                        table,
                                                                                                    }) => {
        const newValidationErrors = validateProductsOutcome(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await updateProductsOutcome(values);
        table.setEditingRow(null);
    };

    const openDeleteConfirmModal = (row: MRT_Row<ProductsOutcome>) => {
        if (window.confirm('Are you sure you want to delete this ProductsOutcome?')) {
            deleteProductsOutcome(row.original.id);
        }
    };

    const table = useMaterialReactTable({
        columns,
        data,
        manualFiltering: true,
        manualSorting: true,
        manualPagination: true,
        createDisplayMode: 'modal',
        editDisplayMode: 'row',
        enableEditing: true,
        getRowId: (row) => (row.id as unknown) as string,
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
        onCreatingRowSave: handleCreateProductsOutcome,
        onEditingRowCancel: () => setValidationErrors({}),
        onEditingRowSave: handleSaveProductsOutcome,
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
                onClick={() => setIsFormOpen(true)}
            >
                Добавить расход товара
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

    return (
        <>
            <MaterialReactTable table={table} />
            <ProductsOutcomeForm
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={() => {
                    setIsFormOpen(false);
                    table.resetRowSelection();
                }}
                warehouses={warehouses}
            />
        </>
    );
};

function useCreateProductsOutcome() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newProductsOutcomeInfo: Omit<ProductsOutcome, 'id'>) => {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...newProductsOutcomeInfo,
                    date: newProductsOutcomeInfo.date
                        ? format(parse(newProductsOutcomeInfo.date, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd')
                        : null,
                }),
            });

            if (!response.ok) {
                throw new Error('Error creating ProductsOutcome');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productsOutcome'] });
        },
    });
}

function useUpdateProductsOutcome() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updatedProductsOutcome: ProductsOutcome) => {
            const response = await fetch(`${API_URL}/${updatedProductsOutcome.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...updatedProductsOutcome,
                    date: updatedProductsOutcome.date
                        ? format(parse(updatedProductsOutcome.date, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd')
                        : null,
                }),
            });

            if (!response.ok) {
                throw new Error('Error updating ProductsOutcome');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productsOutcome'] });
        },
    });
}

function useDeleteProductsOutcome() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Error deleting ProductsOutcome');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productsOutcome'] });
        },
    });
}

function validateProductsOutcome(productsOutcome: Partial<ProductsOutcome>) {
    const errors: Record<string, string> = {};

    if (!productsOutcome.outcome_note_id) {
        errors.outcome_note_id = 'Номер накладной обязателен';
    }
    if (!productsOutcome.warehouse_id) {
        errors.warehouse_id = 'Склад обязателен';
    }
    if (!productsOutcome.contractor) {
        errors.contractor = 'Контрагент обязателен';
    }
    if (!productsOutcome.total) {
        errors.total = 'Сумма обязательна';
    } else if (isNaN(productsOutcome.total) || !Number.isInteger(productsOutcome.total * 100)) {
        errors.total = '';
    }
    if (!productsOutcome.date) {
        errors.date = 'Дата обязательна';
    }

    return errors;
}

const queryClient = new QueryClient();

const ProductsOutcomeTableWithProviders = () => (
    <QueryClientProvider client={queryClient}>
        <ProductsOutcomeTable />
    </QueryClientProvider>
);

export default ProductsOutcomeTableWithProviders;