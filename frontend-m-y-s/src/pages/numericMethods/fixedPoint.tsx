import {
  Button,
  Divider,
  Form,
  getKeyValue,
  Tooltip as HTooltip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from "@heroui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  FixedPointResponse,
  numericMethodsAPI,
  useApiCall,
} from "@/services/api";
import { Expand, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

import DefaultLayout from "@/layouts/default";

export default function FixedPointPage() {
  const [functionLatex, setFunctionLatex] = useState("");
  const [x0, setX0] = useState("");
  const [tolerance, setTolerance] = useState("0.00000001");
  const [iterations, setIterations] = useState("50");

  const { loading, error, data, execute } = useApiCall<FixedPointResponse>();
  const fullRange = useMemo<[number, number]>(
    () => data?.extras.grafico.x_range ?? [0, 0],
    [data?.extras.grafico.x_range]
  );

  const [domain, setDomain] = useState<[number, number]>(fullRange);

  const lastMouseXRef = useRef<number | null>(null);

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const columns = [
    {
      key: "iteracion",
      label: "Iteración",
    },
    {
      key: "x0",
      label: "X0",
    },
    {
      key: "x1",
      label: "X1",
    },
    {
      key: "error_absoluto",
      label: "Error Absoluto",
    },
    {
      key: "error_relativo",
      label: "Error Relativo",
    },
    {
      key: "residuo",
      label: "Residuo",
    },
  ];

  const clampDomain = (min: number, max: number): [number, number] => {
    const [Fmin, Fmax] = fullRange;
    const width = Math.max(1e-15, max - min); // evitar ancho 0
    let a = min,
      b = min + width;

    if (a < Fmin) {
      b += Fmin - a;
      a = Fmin;
    }

    if (b > Fmax) {
      a -= b - Fmax;
      b = Fmax;
    }

    return [a, b];
  };

  const zoomAround = (factor: number, anchor?: number) => {
    const [min, max] = domain;
    const cx = anchor ?? (min + max) / 2;
    const w = (max - min) * factor;

    setDomain(clampDomain(cx - w / 2, cx + w / 2));
  };

  const resetZoom = () => setDomain(fullRange);

  // Brush: recibe índices sobre gCurve
  const onBrushChange = (range: any) => {
    if (
      !range ||
      range.startIndex == null ||
      range.endIndex == null ||
      !data?.extras.grafico.g_curve?.length
    )
      return;
    const s = Math.max(
      0,
      Math.min(range.startIndex, data?.extras.grafico.g_curve?.length ?? 0 - 1)
    );
    const e = Math.max(
      0,
      Math.min(range.endIndex, data?.extras.grafico.g_curve?.length ?? 0 - 1)
    );
    const newMin = data?.extras.grafico.g_curve?.[Math.min(s, e)]?.x ?? 0;
    const newMax = data?.extras.grafico.g_curve?.[Math.max(s, e)]?.x ?? 0;

    setDomain(clampDomain(newMin, newMax));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await execute(() =>
        numericMethodsAPI.fixedPoint({
          g: functionLatex,
          x0: parseFloat(x0),
          tol: parseFloat(tolerance),
          max_iter: parseInt(iterations),
        })
      );
    } catch (err) {
      throw err;
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    // suavidad del zoom: 1.2
    const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
    const anchor = lastMouseXRef.current ?? (domain[0] + domain[1]) / 2;

    zoomAround(factor, anchor);
  };

  const onMouseMove = (state: any) => {
    if (state && typeof state.activeLabel === "number") {
      lastMouseXRef.current = state.activeLabel;
    }
  };

  useEffect(() => {
    setDomain(fullRange);
  }, [fullRange[0], fullRange[1]]);

  return (
    <DefaultLayout>
      <section className="grid grid-rows-[50%_auto_50%] border-r border-gray-600">
        <div className="flex flex-col w-full gap-4 py-8 md:py-4">
          <h1 className="text-2xl font-bold text-center text-white">
            Punto Fijo
          </h1>
          <Form className="flex flex-col w-full p-4 gap-4" onSubmit={onSubmit}>
            <Input
              className="max-w-[100%]"
              label="G(x) (F(x) = 0)"
              labelPlacement="outside-top"
              placeholder="Ingrese la función matemática (ej: x^2 - 4)"
              radius="sm"
              value={functionLatex}
              variant="bordered"
              onChange={(e) => setFunctionLatex(e.target.value)}
            />
            <div className="flex w-full gap-4 py-8 md:py-4">
              <Input
                className="w-1/2"
                label="x0 (Valor inicial)"
                labelPlacement="outside-top"
                placeholder="Ingrese el valor inicial"
                radius="sm"
                type="number"
                value={x0}
                variant="bordered"
                onChange={(e) => setX0(e.target.value)}
              />
            </div>
            <div className="flex w-full gap-4">
              <Input
                className="w-1/2"
                label="Tolerancia"
                labelPlacement="outside-top"
                placeholder="Ingrese la tolerancia"
                radius="sm"
                type="number"
                value={tolerance}
                variant="bordered"
                onChange={(e) => setTolerance(e.target.value)}
              />
              <Input
                className="w-1/2"
                label="Iteraciones (máximo 10.000)"
                labelPlacement="outside-top"
                placeholder="Ingrese el número de iteraciones"
                radius="sm"
                type="number"
                value={iterations}
                variant="bordered"
                onChange={(e) => setIterations(e.target.value)}
              />
            </div>
            <Button
              className="w-full mt-2 !text-gray-200 !bg-[#052814]"
              isDisabled={loading || !functionLatex || !x0}
              isLoading={loading}
              radius="sm"
              type="submit"
              variant="flat"
            >
              {loading ? "Calculando..." : "Calcular"}
            </Button>
          </Form>
        </div>
        <Divider className="bg-gray-600" />
        <div className="flex flex-col p-4 h-full w-full">
          <h2 className="text-xl text-start font-bold text-white">
            Resultados
          </h2>
          {/* Mostrar errores */}
          {error && (
            <h3 className="text-red-400 text-md mt-2 p-2 bg-red-900/20 rounded">
              Error: {error}
            </h3>
          )}

          {/* Mostrar resultados */}
          {data && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-4">
                <Input
                  readOnly
                  className="w-1/2"
                  label="Raíz"
                  labelPlacement="outside-top"
                  radius="sm"
                  value={data.resultado.raiz.toFixed(8)}
                  variant="bordered"
                />
                <Input
                  readOnly
                  className="w-1/2"
                  label="Número de iteraciones"
                  labelPlacement="outside-top"
                  radius="sm"
                  value={data.detalles.n_iter.toString()}
                  variant="bordered"
                />
              </div>

              <Input
                readOnly
                className="max-w-[100%]"
                label="Motivo"
                labelPlacement="outside-top"
                radius="sm"
                value={data.resultado.motivo}
                variant="bordered"
              />
            </div>
          )}
        </div>
      </section>
      <section className="grid grid-rows-[50%_auto_50%]">
        <div
          className="flex flex-col items-center justify-center p-4"
          onWheel={onWheel}
        >
          <div className="flex gap-2 mb-8">
            <HTooltip
              showArrow
              className="bg-gray-600"
              content="Zoom en el gráfico"
              placement="bottom"
            >
              <Button
                className="text-md p-4"
                size="sm"
                startContent={<ZoomOut color="#ebe6e7" size={16} />}
                variant="ghost"
                onPress={() => zoomAround(1.5)}
              />
            </HTooltip>
            <HTooltip
              showArrow
              className="bg-gray-600"
              content="Zoom en el gráfico"
              placement="bottom"
            >
              <Button
                className="text-md p-4"
                size="sm"
                startContent={<ZoomIn color="#ebe6e7" size={16} />}
                variant="ghost"
                onPress={() => zoomAround(1 / 1.5)}
              />
            </HTooltip>
            <HTooltip
              showArrow
              className="bg-gray-600"
              content="Reiniciar zoom"
              placement="bottom"
            >
              <Button
                className="text-md p-4"
                size="sm"
                startContent={<RotateCcw color="#ebe6e7" size={16} />}
                variant="ghost"
                onPress={resetZoom}
              />
            </HTooltip>
            <HTooltip
              showArrow
              className="bg-gray-600"
              content="Expandir gráfico"
              placement="bottom"
            >
              <Button
                className="text-md p-4"
                size="sm"
                startContent={<Expand color="#ebe6e7" size={16} />}
                variant="ghost"
                onPress={onOpen}
              />
            </HTooltip>
          </div>

          <ResponsiveContainer height="100%" width="100%">
            <LineChart onMouseMove={onMouseMove}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis
                allowDataOverflow
                dataKey="x"
                domain={domain}
                tick={{ fill: "#ebe6e7", fontSize: 16 }}
                type="number"
              />
              <YAxis
                allowDataOverflow
                tick={{ fill: "#ebe6e7", fontSize: 16 }}
                type="number"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#121212",
                  border: "1px solid #ebe6e7",
                  borderRadius: "6px",
                  color: "#ebe6e7",
                }}
              />

              {/* y = g(x) */}
              <Line
                data={data?.extras.grafico.g_curve}
                dataKey="y"
                dot={false}
                name="g(x)"
                stroke="#2563eb90"
                strokeWidth={2}
              />

              {/* y = x */}
              <Line
                data={data?.extras.grafico.g_curve.map((p) => ({
                  x: p.x,
                  y: p.x,
                }))}
                dataKey="y"
                dot={false}
                name="y = x"
                stroke="#dc262690"
                strokeDasharray="5 5"
                strokeWidth={2}
              />

              {/* Cobweb */}
              <Line
                dot
                data={data?.extras.grafico.cobweb}
                dataKey="y"
                name="Cobweb"
                stroke="#16a34a90"
                strokeWidth={1.5}
              />

              {/* Selector de rango (brush) usando gCurve como referencia */}
              {data?.extras.grafico.g_curve?.length && (
                <Brush
                  dataKey="x"
                  height={24}
                  tickFormatter={(v) => Number(v).toFixed(3)}
                  travellerWidth={8}
                  onChange={onBrushChange}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <Divider className="bg-gray-600" />
        <div className="p-4 flex flex-col h-full">
          <h2 className="text-xl font-bold mb-4 text-white">
            Tabla de Iteraciones
          </h2>
          <div className="flex-1 min-h-0">
            <Table
              isHeaderSticky
              isStriped
              aria-label="Tabla de iteraciones del método de punto fijo"
              classNames={{
                base: "overflow-y-auto max-h-full",
              }}
            >
              <TableHeader columns={columns}>
                {(column) => (
                  <TableColumn
                    key={column.key}
                    className="bg-[#052814] text-gray-200"
                  >
                    {column.label}
                  </TableColumn>
                )}
              </TableHeader>
              <TableBody items={data?.resultado.iteraciones ?? []}>
                {(item) => (
                  <TableRow key={item.iteracion}>
                    {(columnKey) => (
                      <TableCell>{getKeyValue(item, columnKey)}</TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
      <Modal
        hideCloseButton
        backdrop="blur"
        isOpen={isOpen}
        placement="center"
        onOpenChange={onOpenChange}
      >
        <ModalContent
          className="
      bg-[#0b0b0b] text-[#ebe6e7]
      max-w-[90vw] w-[90vw]
      max-h-[90vh] h-[90vh]
      p-2
    "
        >
          {(close) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <span className="font-semibold">
                  Punto Fijo — Vista ampliada
                </span>
                <div className="ml-auto flex gap-2">
                  <HTooltip
                    showArrow
                    className="bg-gray-600"
                    content="Zoom −"
                    placement="bottom"
                  >
                    <Button
                      className="text-md p-4"
                      size="sm"
                      startContent={<ZoomOut color="#ebe6e7" size={16} />}
                      variant="ghost"
                      onPress={() => zoomAround(1.5)}
                    />
                  </HTooltip>
                  <HTooltip
                    showArrow
                    className="bg-gray-600"
                    content="Zoom +"
                    placement="bottom"
                  >
                    <Button
                      className="text-md p-4"
                      size="sm"
                      startContent={<ZoomIn color="#ebe6e7" size={16} />}
                      variant="ghost"
                      onPress={() => zoomAround(1 / 1.5)}
                    />
                  </HTooltip>
                  <HTooltip
                    showArrow
                    className="bg-gray-600"
                    content="Reiniciar zoom"
                    placement="bottom"
                  >
                    <Button
                      className="text-md p-4"
                      size="sm"
                      startContent={<RotateCcw color="#ebe6e7" size={16} />}
                      variant="ghost"
                      onPress={resetZoom}
                    />
                  </HTooltip>
                  <HTooltip
                    showArrow
                    className="bg-gray-600"
                    content="Cerrar"
                    placement="bottom"
                  >
                    <Button
                      className="text-md p-4"
                      size="sm"
                      startContent={<X color="#ebe6e7" size={16} />}
                      variant="ghost"
                      onPress={close}
                    />
                  </HTooltip>
                </div>
              </ModalHeader>

              <ModalBody className="p-2">
                {/* Contenedor para ocupar 100% del modal */}
                <div className="w-full h-[78vh]" onWheel={onWheel}>
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart onMouseMove={onMouseMove}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        strokeOpacity={0.3}
                      />
                      <XAxis
                        allowDataOverflow
                        dataKey="x"
                        domain={domain}
                        tick={{ fill: "#ebe6e7", fontSize: 16 }}
                        type="number"
                      />
                      <YAxis
                        allowDataOverflow
                        tick={{ fill: "#ebe6e7", fontSize: 16 }}
                        type="number"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#121212",
                          border: "1px solid #ebe6e7",
                          borderRadius: "6px",
                          color: "#ebe6e7",
                        }}
                      />

                      {/* y = g(x) */}
                      <Line
                        data={data?.extras.grafico.g_curve}
                        dataKey="y"
                        dot={false}
                        name="g(x)"
                        stroke="#2563eb90"
                        strokeWidth={2}
                      />

                      {/* y = x */}
                      <Line
                        data={
                          data?.extras.grafico.g_curve?.map((p) => ({
                            x: p.x,
                            y: p.x,
                          })) ?? []
                        }
                        dataKey="y"
                        dot={false}
                        name="y = x"
                        stroke="#dc262690"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                      />

                      {/* Cobweb */}
                      <Line
                        dot
                        data={data?.extras.grafico.cobweb}
                        dataKey="y"
                        name="Cobweb"
                        stroke="#16a34a90"
                        strokeWidth={1.5}
                      />

                      {/* Brush */}
                      {data?.extras.grafico.g_curve?.length && (
                        <Brush
                          dataKey="x"
                          height={24}
                          tickFormatter={(v) => Number(v).toFixed(3)}
                          travellerWidth={8}
                          onChange={onBrushChange}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ModalBody>

              <ModalFooter className="justify-end">
                <Button
                  className="bg-gray-800 text-gray-100"
                  variant="flat"
                  onPress={onClose}
                >
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </DefaultLayout>
  );
}
