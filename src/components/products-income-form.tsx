'use client'

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { format, parse } from 'date-fns';

type ProductsIncome = {
  id: number;
  income_note_id: number;
  warehouse_id: number;
  contractor: string;
  total: number;
  date: string;
}

type IncomeNote = {
  id: number;
  product_id: number;
  item_number: string;
  price: number;
  quantity: number;
  total: number;
  income_note_id: number;
}

type Warehouse = {
  warehouse_id: number;
  warehouse_name: string;
}

type Product = {
  product_id: number;
  item_number: string;
  product_name: string;
}

type ProductsIncomeFormProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouses: Warehouse[];
};

const API_URL = 'http://localhost:5000/api';
const PRODUCTS_API_URL = 'http://localhost:5000/api/products';

export default function ProductsIncomeForm({ open, onClose, onSuccess, warehouses }: ProductsIncomeFormProps) {
  const [productsIncome, setProductsIncome] = useState<Omit<ProductsIncome, 'id'>>({
    income_note_id: 0,
    warehouse_id: 0,
    contractor: '',
    total: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [incomeNotes, setIncomeNotes] = useState<Omit<IncomeNote, 'id'>[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProducts = async () => {
      const response = await fetch(PRODUCTS_API_URL);
      const data = await response.json();
      setProducts(data.data);
    };

    fetchProducts();
  }, []);

  const createProductsIncomeMutation = useMutation<
      unknown,
      unknown,
      {
        productsIncome: Omit<ProductsIncome, 'id'>;
        incomeNotes: Omit<IncomeNote, 'id'>[];
      }
  >({
    mutationFn: async (data) => {
      const response1 = await fetch(`${API_URL}/products_income`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.productsIncome),
      });
      if (!response1.ok) throw new Error('Failed to create products income');
      const createdProductsIncome = await response1.json();

      const incomeNotesWithId = data.incomeNotes.map(note => ({
        ...note,
        income_note_id: createdProductsIncome.income_note_id
      }));

      const response2 = await fetch(`${API_URL}/income_notes`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(incomeNotesWithId),
      });
      if (!response2.ok) throw new Error('Failed to create income notes');

      return createdProductsIncome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productsIncome']});
      onSuccess();
      onClose();
    },
  });

  const handleProductsIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProductsIncome(prev => ({
      ...prev,
      [name]: name === 'income_note_id' || name === 'warehouse_id' ? Number(value) :
          name === 'total' ? parseFloat(value) : value,
    }));
  };

  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setProductsIncome(prev => ({ ...prev, date: format(newDate, 'yyyy-MM-dd') }));
    }
  };

  const handleIncomeNoteChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIncomeNotes(prev => prev.map((note, i) =>
        i === index ? {
          ...note,
          [name]: ['price', 'quantity', 'total'].includes(name) ? parseFloat(value) :
              name === 'product_id' ? Number(value) : value
        } : note
    ));
  };

  const addIncomeNote = () => {
    setIncomeNotes(prev => [...prev, { product_id: 0, item_number: '', price: 0, quantity: 0, total: 0, income_note_id: productsIncome.income_note_id }]);
  };

  const removeIncomeNote = (index: number) => {
    setIncomeNotes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    createProductsIncomeMutation.mutate({
      productsIncome,
      incomeNotes,
    });
  };

  return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
          <DialogTitle>Добавить приход товара</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
              <TextField
                  label="Номер накладной прихода"
                  name="income_note_id"
                  type="number"
                  value={productsIncome.income_note_id}
                  onChange={handleProductsIncomeChange}
              />
              <TextField
                  select
                  label="Склад"
                  name="warehouse_id"
                  value={productsIncome.warehouse_id}
                  onChange={handleProductsIncomeChange}
              >
                {warehouses.map((warehouse) => (
                    <MenuItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                      {warehouse.warehouse_name}
                    </MenuItem>
                ))}
              </TextField>
              <TextField
                  label="Контрагент"
                  name="contractor"
                  value={productsIncome.contractor}
                  onChange={handleProductsIncomeChange}
              />
              <TextField
                  label="Сумма"
                  name="total"
                  type="number"
                  inputProps={{ step: 0.01 }}
                  value={productsIncome.total}
                  onChange={handleProductsIncomeChange}
              />
              <DatePicker
                  label="Дата"
                  value={parse(productsIncome.date, 'yyyy-MM-dd', new Date())}
                  onChange={handleDateChange}
                  format="dd.MM.yyyy"
              />
            </Box>

            <Box sx={{ mt: 4 }}>
              <Button startIcon={<AddIcon />} onClick={addIncomeNote}>
                Добавить товар
              </Button>
            </Box>

            {incomeNotes.map((note, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, my: 2, alignItems: 'center' }}>
                  <TextField
                      label="Код товара"
                      name="product_id"
                      type="number"
                      value={note.product_id}
                      InputProps={{
                        readOnly: true,
                      }}
                  />
                  <TextField
                      select
                      label="Номенклатурный номер"
                      name="item_number"
                      value={note.item_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        handleIncomeNoteChange(index, e);
                        const selectedProduct = products.find(p => p.item_number === e.target.value);
                        if (selectedProduct) {
                          handleIncomeNoteChange(index, {
                            target: { name: 'product_id', value: selectedProduct.product_id.toString() }
                          } as React.ChangeEvent<HTMLInputElement>);
                        }
                      }}
                  >
                    {products.map((product) => (
                        <MenuItem key={product.item_number} value={product.item_number}>
                          {`${product.item_number} (${product.product_name})`}
                        </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                      label="Цена"
                      name="price"
                      type="number"
                      inputProps={{ step: 0.01 }}
                      value={note.price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeNoteChange(index, e)}
                  />
                  <TextField
                      label="Количество"
                      name="quantity"
                      type="number"
                      value={note.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeNoteChange(index, e)}
                  />
                  <TextField
                      label="Сумма"
                      name="total"
                      type="number"
                      inputProps={{ step: 0.01 }}
                      value={note.total}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeNoteChange(index, e)}
                  />
                  <IconButton onClick={() => removeIncomeNote(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </LocalizationProvider>
  );
}