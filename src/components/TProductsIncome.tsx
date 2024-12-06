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
import ProductsIncomeForm from "./products-income-form";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { format, parse, isValid } from 'date-fns';

const API_URL = 'http://localhost:5000/api/products_income';
const WAREHOUSES_API_URL = 'http://localhost:5000/api/warehouses';
const url = new URL(API_URL, window.location.origin);

type ProductsIncome = {
    id: number;
    income_note_id: number;
    warehouse_id: number;
    contractor: string;
    total: number;
    date: string;
}

type Warehouse = {
    warehouse_id: number;
    warehouse_name: string;
}

type ProductsIncomeApiResponse = {
    data: Array<ProductsIncome>;
    meta: {
        totalRowCount: number;
    };
};

const ProductsIncomeTable = () => {
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

    const columns = useMemo<MRT_ColumnDef<ProductsIncome>[]>(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                enableEditing: false,
                size: 80,
            },
            {
                accessorKey: 'income_note_id',
                header: 'Номер накладной прихода',
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
    } = useGet<ProductsIncomeApiResponse>(url, pagination, columnFilters, globalFilter, sorting);

    const { mutateAsync: createProductsIncome, isPending: isCreatingProductsIncome } =
        useCreateProductsIncome();
    const { mutateAsync: updateProductsIncome, isPending: isUpdatingProductsIncome } =
        useUpdateProductsIncome();
    const { mutateAsync: deleteProductsIncome, isPending: isDeletingProductsIncome } =
        useDeleteProductsIncome();

    const handleCreateProductsIncome: MRT_TableOptions<ProductsIncome>['onCreatingRowSave'] = async ({
                                                                                                         values,
                                                                                                         table,
                                                                                                     }) => {
        const newValidationErrors = validateProductsIncome(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await createProductsIncome(values);
        table.setCreatingRow(null);
    };

    const handleSaveProductsIncome: MRT_TableOptions<ProductsIncome>['onEditingRowSave'] = async ({
                                                                                                      values,
                                                                                                      table,
                                                                                                  }) => {
        const newValidationErrors = validateProductsIncome(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await updateProductsIncome(values);
        table.setEditingRow(null);
    };

    const openDeleteConfirmModal = (row: MRT_Row<ProductsIncome>) => {
        if (window.confirm('Are you sure you want to delete this ProductsIncome?')) {
            deleteProductsIncome(row.original.id);
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
        onCreatingRowSave: handleCreateProductsIncome,
        onEditingRowCancel: () => setValidationErrors({}),
        onEditingRowSave: handleSaveProductsIncome,
        renderRowActions: ({ row, table }) => (
            <Box sx={{ display: 'flex', gap: '1rem' }}>
                <Tooltip title="Изменить">
                    <IconButton onClick={() => table.setEditingRow(row)}>
                        <EditIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Удалить">
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
                Добавить приход товара
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
            <ProductsIncomeForm
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

function useCreateProductsIncome() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newProductsIncomeInfo: Omit<ProductsIncome, 'id'>) => {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...newProductsIncomeInfo,
                    date: newProductsIncomeInfo.date
                        ? format(parse(newProductsIncomeInfo.date, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd')
                        : null,
                }),
            });

            if (!response.ok) {
                throw new Error('Error creating ProductsIncome');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productsIncome'] });
        },
    });
}

function useUpdateProductsIncome() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updatedProductsIncome: ProductsIncome) => {
            const response = await fetch(`${API_URL}/${updatedProductsIncome.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...updatedProductsIncome,
                    date: updatedProductsIncome.date
                        ? format(parse(updatedProductsIncome.date, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd')
                        : null,
                }),
            });

            if (!response.ok) {
                throw new Error('Error updating ProductsIncome');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productsIncome'] });
        },
    });
}

function useDeleteProductsIncome() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Error deleting ProductsIncome');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productsIncome'] });
        },
    });
}

function validateProductsIncome(productsIncome: Partial<ProductsIncome>) {
    const errors: Record<string, string> = {};

    if (!productsIncome.income_note_id) {
        errors.income_note_id = 'Номер накладной обязателен';
    }
    if (!productsIncome.warehouse_id) {
        errors.warehouse_id = 'Склад обязателен';
    }
    if (!productsIncome.contractor) {
        errors.contractor = 'Контрагент обязателен';
    }
    if (!productsIncome.total) {
        errors.total = 'Сумма обязательна';
    } else if (isNaN(productsIncome.total) || !Number.isInteger(productsIncome.total * 100)) {
        errors.total = '';
    }
    if (!productsIncome.date) {
        errors.date = 'Дата обязательна';
    }

    return errors;
}

const queryClient = new QueryClient();

const ProductsIncomeTableWithProviders = () => (
    <QueryClientProvider client={queryClient}>
        <ProductsIncomeTable />
    </QueryClientProvider>
);

export default ProductsIncomeTableWithProviders;