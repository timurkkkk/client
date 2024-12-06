'use client'

import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Grid,
} from '@mui/material';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useMutation, useQuery } from '@tanstack/react-query';
import { SelectChangeEvent } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { format, parse } from 'date-fns';

type ReportType = 'inventory' | 'revenue' | 'cost';

type ReportParams = {
  warehouseId: number | null;
  startDate: string;
  endDate: string;
  groupBy: 'warehouse_id' | 'item_number';
  sortBy: 'warehouse_id' | 'item_number' | 'product_name' | 'total_remaining' | 'total';
};

type ReportData = {
  warehouse_id: number;
  item_number: string;
  product_name: string;
  total_remaining?: number;
  total?: number;
};

type Warehouse = {
  warehouse_id: number;
  warehouse_name: string;
};

const API_URL = 'http://localhost:5000/api';

export default function IntegratedReportComponent() {
  const [reportType, setReportType] = useState<ReportType>('inventory');
  const [reportParams, setReportParams] = useState<ReportParams>({
    warehouseId: null,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    groupBy: 'warehouse_id',
    sortBy: 'item_number',
  });
  const [reportData, setReportData] = useState<ReportData[]>([]);

  const { data: warehousesData, isLoading, isError } = useQuery<{ data: Warehouse[] }>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/warehouses`);
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      return response.json();
    },
  });

  const warehouses = warehousesData?.data || [];

  const generateReportMutation = useMutation<ReportData[], Error, { type: ReportType; params: ReportParams }>({
    mutationFn: async ({ type, params }) => {
      const response = await fetch(`${API_URL}/${type}-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error(`Failed to generate ${type} report`);
      return response.json();
    },
    onSuccess: (data) => {
      setReportData(data);
    },
  });

  const handleReportTypeChange = (event: SelectChangeEvent<ReportType>) => {
    const newReportType = event.target.value as ReportType;
    setReportType(newReportType);
    setReportData([]);
    // Reset sortBy if it's not applicable to the new report type
    if (newReportType === 'inventory' && reportParams.sortBy === 'total') {
      setReportParams(prev => ({ ...prev, sortBy: 'total_remaining' }));
    } else if (newReportType !== 'inventory' && reportParams.sortBy === 'total_remaining') {
      setReportParams(prev => ({ ...prev, sortBy: 'total' }));
    }
  };

  const handleParamChange = (event: SelectChangeEvent<number | string>) => {
    const name = event.target.name as keyof typeof reportParams;
    const value = event.target.value;
    setReportParams(prev => ({
      ...prev,
      [name]: name === 'warehouseId' ? (value === 'all' ? null : Number(value)) : value,
    }));
  };

  const handleDateChange = (name: 'startDate' | 'endDate') => (date: Date | null) => {
    if (date) {
      setReportParams(prev => ({
        ...prev,
        [name]: format(date, 'yyyy-MM-dd'),
      }));
    }
  };

  const handleGenerateReport = () => {
    generateReportMutation.mutate({ type: reportType, params: reportParams });
  };

  const columns: MRT_ColumnDef<ReportData>[] = [
    {
      accessorKey: 'warehouse_id',
      header: 'Склад',
    },
    {
      accessorKey: 'item_number',
      header: 'Номенклатурный номер',
    },
    {
      accessorKey: 'product_name',
      header: 'Наименование товара',
    },
    ...(reportType === 'inventory'
        ? [
          {
            accessorKey: 'total_remaining',
            header: 'Остаток',
          } as MRT_ColumnDef<ReportData>,
        ]
        : [
          {
            accessorKey: 'total',
            header: 'Сумма',
            Cell: ({ cell }: { cell: { getValue: () => any } }) => `${Number(cell.getValue()).toFixed(2)}₽`,
          } as MRT_ColumnDef<ReportData>,
        ]),
  ];

  const totalAmount = reportData.reduce((sum, item) => sum + Number(item.total || 0), 0);

  if (isLoading) return <Typography>Загрузка складов...</Typography>;
  if (isError) return <Typography>Ошибка при загрузке складов</Typography>;

  return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h4" gutterBottom>
            Отчет
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="report-type-label">Тип отчета</InputLabel>
                <Select
                    labelId="report-type-label"
                    name="reportType"
                    value={reportType}
                    onChange={handleReportTypeChange}
                >
                  <MenuItem value="inventory">Остаток на складах</MenuItem>
                  <MenuItem value="revenue">Выручка от реализации</MenuItem>
                  <MenuItem value="cost">Расходы</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="warehouse-id-label">Склад</InputLabel>
                <Select
                    labelId="warehouse-id-label"
                    name="warehouseId"
                    value={reportParams.warehouseId === null ? 'all' : reportParams.warehouseId}
                    onChange={handleParamChange}
                >
                  <MenuItem value="all">Все склады</MenuItem>
                  {warehouses.map((warehouse) => (
                      <MenuItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                        ID: {warehouse.warehouse_id} ({warehouse.warehouse_name})
                      </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {reportType !== 'inventory' && (
                <>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                        label="С"
                        value={parse(reportParams.startDate, 'yyyy-MM-dd', new Date())}
                        onChange={handleDateChange('startDate')}
                        format="dd.MM.yyyy"
                        sx={{ width: '100%' }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                        label="По"
                        value={parse(reportParams.endDate, 'yyyy-MM-dd', new Date())}
                        onChange={handleDateChange('endDate')}
                        format="dd.MM.yyyy"
                        sx={{ width: '100%' }}
                    />
                  </Grid>
                </>
            )}
            {reportType === 'inventory' && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="group-by-label">Группировать по</InputLabel>
                    <Select
                        labelId="group-by-label"
                        name="groupBy"
                        value={reportParams.groupBy}
                        onChange={handleParamChange}
                    >
                      <MenuItem value="warehouse_id">Склад</MenuItem>
                      <MenuItem value="item_number">Номенклатурный номер</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
            )}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="sort-by-label">Сортировать по</InputLabel>
                <Select
                    labelId="sort-by-label"
                    name="sortBy"
                    value={reportParams.sortBy}
                    onChange={handleParamChange}
                >
                  <MenuItem value="warehouse_id">Склад</MenuItem>
                  <MenuItem value="item_number">Номенклатурный номер</MenuItem>
                  <MenuItem value="product_name">Наименование товара</MenuItem>
                  {reportType === 'inventory' && (
                      <MenuItem value="total_remaining">Остаток</MenuItem>
                  )}
                  {reportType !== 'inventory' && (
                      <MenuItem value="total">Сумма</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Button variant="contained" onClick={handleGenerateReport} sx={{ mb: 2 }}>
            Сформировать отчет
          </Button>
          {reportData.length > 0 && (
              <>
                <MaterialReactTable
                    columns={columns}
                    data={reportData}
                    enableColumnActions={false}
                    enableColumnFilters={false}
                    enablePagination={false}
                    enableSorting={false}
                    enableBottomToolbar={false}
                    enableTopToolbar={false}
                    muiTableBodyRowProps={{ hover: false }}
                />
                {reportType !== 'inventory' && (
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      Итого: {totalAmount.toFixed(2)}₽
                    </Typography>
                )}
              </>
          )}
        </Box>
      </LocalizationProvider>
  );
}