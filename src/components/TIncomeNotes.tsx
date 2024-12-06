import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    MaterialReactTable,
    type MRT_ColumnDef,
    type MRT_Row,
    type MRT_TableOptions,
    type MRT_ColumnFiltersState,
    type MRT_PaginationState,
    type MRT_SortingState,
    type MRT_TableInstance,
    useMaterialReactTable,
} from 'material-react-table';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import {
    QueryClient,
    QueryClientProvider,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import useGet from "./useGet";

const API_URL = 'http://localhost:5000/api/income_notes';
const PRODUCTS_API_URL = 'http://localhost:5000/api/products';
const PRODUCTS_INCOME_API_URL = 'http://localhost:5000/api/products_income';
const url = new URL(API_URL, window.location.origin);

type IncomeNote = {
    id: number;
    income_note_id: number;
    product_id: number;
    item_number: string;
    price: number;
    quantity: number;
    total: number;
}

type Product = {
    product_id: number;
    item_number: string;
    product_name: string;
}

type ProductsIncome = {
    id: number;
    income_note_id: number;
}

type IncomeNoteApiResponse = {
    data: Array<IncomeNote>;
    meta: {
        totalRowCount: number;
    };
};

const IncomeNotesTable = () => {
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

    const [products, setProducts] = useState<Product[]>([]);
    const [productsIncome, setProductsIncome] = useState<ProductsIncome[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch(PRODUCTS_API_URL);
                if (!response.ok) {
                    throw new Error('Failed to fetch products');
                }
                const data = await response.json();
                setProducts(data.data);
                console.log('Products fetched:', data.data);
            } catch (error) {
                console.error('Error fetching products:', error);
                setError('Failed to load products. Please try again later.');
            }
        };

        const fetchProductsIncome = async () => {
            try {
                const response = await fetch(PRODUCTS_INCOME_API_URL);
                if (!response.ok) {
                    throw new Error('Failed to fetch products income');
                }
                const data = await response.json();
                setProductsIncome(data.data);
                console.log('Products income fetched:', data.data);
            } catch (error) {
                console.error('Error fetching products income:', error);
                setError('Failed to load products income. Please try again later.');
            }
        };

        fetchProducts();
        fetchProductsIncome();
    }, []);

    const columns = useMemo<MRT_ColumnDef<IncomeNote>[]>(
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
                editVariant: 'select',
                editSelectOptions: productsIncome.map(pi => ({
                    value: pi.income_note_id,
                    label: pi.income_note_id.toString(),
                })),
                muiEditTextFieldProps: {
                    select: true,
                },
            },
            {
                accessorKey: 'product_id',
                header: 'Код товара',
                enableEditing: false,
            },
            {
                accessorKey: 'item_number',
                header: 'Номенклатурный номер',
                editVariant: 'select',
                editSelectOptions: products.map(p => ({
                    value: p.item_number,
                    label: `${p.item_number} (${p.product_name})`,
                })),
                muiEditTextFieldProps: {
                    select: true,
                },
            },
            {
                accessorKey: 'price',
                header: 'Цена',
                Cell: ({ cell }) => parseFloat(cell.getValue<string>()).toFixed(2),
                muiEditTextFieldProps: {
                    type: 'number',
                    inputProps: { step: 0.01 },
                },
            },
            {
                accessorKey: 'quantity',
                header: 'Количество',
                muiEditTextFieldProps: {
                    type: 'number',
                },
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
        ],
        [products, productsIncome]
    );

    const {
        data: { data = [], meta } = {},
        isError,
        isRefetching,
        isLoading,
    } = useGet<IncomeNoteApiResponse>(url, pagination, columnFilters, globalFilter, sorting);

    const queryClient = useQueryClient();

    const { mutateAsync: createIncomeNote, isPending: isCreatingIncomeNote } = useMutation({
        mutationFn: async (newIncomeNote: Omit<IncomeNote, 'id'>) => {
            console.log('Attempting to create income note:', newIncomeNote);
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([newIncomeNote]),
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server responded with an error:', errorData);
                throw new Error(errorData.message || 'Failed to create income note');
            }
            const data = await response.json();
            console.log('Income note created successfully:', data);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income_notes'] });
            setError(null);
            console.log('Query cache invalidated after successful creation');
        },
        onError: (error: Error) => {
            console.error('Error creating income note:', error);
            setError(`Failed to create income note: ${error.message}`);
        },
    });

    const { mutateAsync: updateIncomeNote, isPending: isUpdatingIncomeNote } = useMutation({
        mutationFn: async (updatedIncomeNote: IncomeNote) => {
            console.log('Attempting to update income note:', updatedIncomeNote);
            const response = await fetch(`${API_URL}/${updatedIncomeNote.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedIncomeNote),
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server responded with an error:', errorData);
                throw new Error(errorData.message || 'Failed to update income note');
            }
            const data = await response.json();
            console.log('Income note updated successfully:', data);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income_notes'] });
            setError(null);
            console.log('Query cache invalidated after successful update');
        },
        onError: (error: Error) => {
            console.error('Error updating income note:', error);
            setError(`Failed to update income note: ${error.message}`);
        },
    });

    const { mutateAsync: deleteIncomeNote, isPending: isDeletingIncomeNote } = useMutation({
        mutationFn: async (id: number) => {
            console.log('Attempting to delete income note with id:', id);
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server responded with an error:', errorData);
                throw new Error(errorData.message || 'Failed to delete income note');
            }
            const data = await response.json();
            console.log('Income note deleted successfully:', data);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income_notes'] });
            setError(null);
            console.log('Query cache invalidated after successful deletion');
        },
        onError: (error: Error) => {
            console.error('Error deleting income note:', error);
            setError(`Failed to delete income note: ${error.message}`);
        },
    });

    const handleCreateIncomeNote: MRT_TableOptions<IncomeNote>['onCreatingRowSave'] = useCallback(async ({
                                                                                                             values,
                                                                                                             table,
                                                                                                         }: {
        values: IncomeNote;
        table: MRT_TableInstance<IncomeNote>;
    }) => {
        console.log('handleCreateIncomeNote called with values:', values);
        const newValidationErrors = validateIncomeNote(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            console.log('Validation errors:', newValidationErrors);
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});

        const selectedProduct = products.find(p => p.item_number === values.item_number);
        if (selectedProduct) {
            values.product_id = selectedProduct.product_id;
            console.log('Selected product:', selectedProduct);
        } else {
            console.log('No matching product found for item_number:', values.item_number);
        }

        try {
            console.log('Calling createIncomeNote with values:', values);
            await createIncomeNote(values);
            console.log('Income note created successfully');
            table.setCreatingRow(null);
        } catch (error) {
            console.error('Error in handleCreateIncomeNote:', error);
        }
    }, [createIncomeNote, products]);

    const handleSaveIncomeNote: MRT_TableOptions<IncomeNote>['onEditingRowSave'] = useCallback(async ({
                                                                                                          values,
                                                                                                          table,
                                                                                                      }: {
        values: IncomeNote;
        table: MRT_TableInstance<IncomeNote>;
    }) => {
        console.log('handleSaveIncomeNote called with values:', values);
        const newValidationErrors = validateIncomeNote(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            console.log('Validation errors:', newValidationErrors);
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});

        const selectedProduct = products.find(p => p.item_number === values.item_number);
        if (selectedProduct) {
            values.product_id = selectedProduct.product_id;
            console.log('Selected product:', selectedProduct);
        } else {
            console.log('No matching product found for item_number:', values.item_number);
        }

        try {
            console.log('Calling updateIncomeNote with values:', values);
            await updateIncomeNote(values);
            console.log('Income note updated successfully');
            table.setEditingRow(null);
        } catch (error) {
            console.error('Error in handleSaveIncomeNote:', error);
        }
    }, [updateIncomeNote, products]);

    const openDeleteConfirmModal = useCallback((row: MRT_Row<IncomeNote>) => {
        if (window.confirm('Are you sure you want to delete this income note?')) {
            console.log('Deleting income note:', row.original);
            deleteIncomeNote(row.original.id);
        }
    }, [deleteIncomeNote]);

    const table = useMaterialReactTable({
        columns,
        data,
        manualFiltering: true,
        manualSorting: true,
        manualPagination: true,
        createDisplayMode: 'row',
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
        onCreatingRowSave: handleCreateIncomeNote,
        onEditingRowCancel: () => setValidationErrors({}),
        onEditingRowSave: handleSaveIncomeNote,
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
                    console.log('Add record button clicked');
                    table.setCreatingRow(true);
                }}
            >
                Добавить запись
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
            {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}
            <MaterialReactTable table={table} />
        </>
    );
};

function validateIncomeNote(incomeNote: Partial<IncomeNote>) {
    console.log('Validating income note:', incomeNote);
    const errors: Record<string, string> = {};

    if (!incomeNote.item_number) {
        errors.item_number = 'Номенклатурный номер обязателен';
    }
    if (!incomeNote.price) {
        errors.price = 'Цена обязательна';
    }
    if (!incomeNote.quantity) {
        errors.quantity = 'Количество обязательно';
    }
    if (!incomeNote.total) {
        errors.total = 'Сумма обязательна';
    }
    if (!incomeNote.income_note_id) {
        errors.income_note_id = 'Номер накладной прихода обязателен';
    }

    console.log('Validation errors:', errors);
    return errors;
}

const queryClient = new QueryClient();

const IncomeNotesTableWithProviders = () => (
    <QueryClientProvider client={queryClient}>
        <IncomeNotesTable />
    </QueryClientProvider>
);

export default IncomeNotesTableWithProviders;