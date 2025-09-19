// src/pages/numericMethods/LagrangePage.tsx
import DefaultLayout from "@/layouts/default";
import { useApiCall } from "@/services/api";
import {
  Button,
  Card,
  CardBody,
  Divider,
  Form,
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
import { X as Close, Expand, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type LagrangeResponse = {
  metodo: "lagrange";
  extras: {
    polinomio: { expr: string; latex: string };
    bases: { i: number; expr: string; latex: string }[];
    tabla: { x: number; y: number; "P(x)": number }[];
    errores?: {
      max_abs_error: number | null;
      mae: number | null;
      rmse: number | null;
      en_nodos: { x: number; y: number; error: number }[];
      teorico: {
        pi_x: string;
        orden_derivada: number;
        f_derivada_n: string | null;
        formula: string;
      };
    };
    grafico: {
      x_range: [number, number];
      y_range: [number, number] | null;
      p_curve: { x: number; y: number }[];
      f_curve?: { x: number; y: number }[];
      points: { x: number; y: number }[];
      error_curve?: { x: number; y: number }[];
    };
  };
};

export default function LagrangePage() {
  const [pairs, setPairs] = useState<{ x: number; y: number }[]>([]);
  const [currentX, setCurrentX] = useState("");
  const [currentY, setCurrentY] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [fx, setFx] = useState("");
  const { loading, error, data, execute } = useApiCall<LagrangeResponse>();

  // Curvas
  const pCurve = data?.extras.grafico.p_curve ?? [];
  const fCurve = data?.extras.grafico.f_curve ?? [];
  const pts = data?.extras.grafico.points ?? [];
  const xRange = data?.extras.grafico.x_range as [number, number] | undefined;

  const fullRange = useMemo<[number, number]>(
    () => xRange ?? [-1, 1],
    [xRange?.[0], xRange?.[1]]
  );
  const [domain, setDomain] = useState<[number, number]>(fullRange);

  // Y auto-fit según lo visible y ambas curvas
  const yDomain = useMemo<[number, number]>(() => {
    const curves = [...pCurve, ...fCurve];
    if (!curves.length) return [-1, 1];

    const [minX, maxX] =
      domain[0] <= domain[1]
        ? domain
        : ([domain[1], domain[0]] as [number, number]);
    let minY = Number.POSITIVE_INFINITY,
      maxY = Number.NEGATIVE_INFINITY;
    for (const p of curves)
      if (p.x >= minX && p.x <= maxX) {
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    if (!isFinite(minY) || !isFinite(maxY)) return [-1, 1];
    if (minY === maxY) {
      const eps = Math.max(1, Math.abs(minY) * 0.1);
      minY -= eps;
      maxY += eps;
    }
    minY = Math.min(minY, 0);
    maxY = Math.max(maxY, 0);
    const pad = 0.08 * Math.max(1, Math.abs(maxY - minY));
    return [minY - pad, maxY + pad];
  }, [pCurve, fCurve, domain]);

  useEffect(() => {
    setDomain(fullRange);
  }, [fullRange[0], fullRange[1]]);

  const lastMouseXRef = useRef<number | null>(null);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  // Zoom helpers
  const clampDomain = (min: number, max: number): [number, number] => {
    const [Fmin, Fmax] = fullRange;
    const width = Math.max(1e-15, max - min);
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
  const onWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
    const anchor = lastMouseXRef.current ?? (domain[0] + domain[1]) / 2;
    zoomAround(factor, anchor);
  };
  const onMouseMove = (state: any) => {
    if (state && typeof state.activeLabel === "number")
      lastMouseXRef.current = state.activeLabel;
  };
  const onBrushChange = (range: any) => {
    const all = pCurve.length ? pCurve : fCurve;
    if (!range || !all.length) return;
    const s = Math.max(0, Math.min(range.startIndex ?? 0, all.length - 1));
    const e = Math.max(0, Math.min(range.endIndex ?? 0, all.length - 1));
    const newMin = all[Math.min(s, e)].x;
    const newMax = all[Math.max(s, e)].x;
    setDomain(clampDomain(newMin, newMax));
  };

  // Funciones para manejar puntos
  const addPoint = () => {
    const x = parseFloat(currentX);
    const y = parseFloat(currentY);

    if (!isNaN(x) && !isNaN(y)) {
      // Verificar si el punto ya existe
      const exists = pairs.some((p) => p.x === x && p.y === y);
      if (!exists) {
        setPairs([...pairs, { x, y }]);
        setCurrentX("");
        setCurrentY("");
      }
    }
  };

  const removeSelectedPoints = () => {
    const indicesToRemove = Array.from(selectedRows).map((key) =>
      parseInt(key)
    );
    const newPairs = pairs.filter(
      (_, index) => !indicesToRemove.includes(index)
    );
    setPairs(newPairs);
    setSelectedRows(new Set());
  };

  const handleSelectionChange = (keys: any) => {
    if (keys === "all") {
      // Seleccionar todos
      setSelectedRows(new Set(pairs.map((_, index) => index.toString())));
    } else {
      // Selección normal
      setSelectedRows(new Set(Array.from(keys).map(String)));
    }
  };

  const canAddPoint =
    currentX.trim() !== "" &&
    currentY.trim() !== "" &&
    !isNaN(parseFloat(currentX)) &&
    !isNaN(parseFloat(currentY));

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pairs.length === 0) return;

    await execute(() =>
      fetch(import.meta.env.VITE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metodo: "lagrange",
          pares: pairs,
          fx: fx || null, // opcional
          graph_mode: "geogebra",
          x_min: -15,
          x_max: 15,
          samples: 1500,
        }),
      }).then((r) => r.json())
    );
  };

  const renderChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart onMouseMove={onMouseMove}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
        <XAxis
          type="number"
          dataKey="x"
          domain={domain}
          allowDataOverflow
          tick={{ fill: "#ebe6e7" }}
        />
        <YAxis
          type="number"
          domain={yDomain}
          allowDataOverflow
          tick={{ fill: "#ebe6e7" }}
        />
        <Tooltip
          contentStyle={{
            background: "#121212",
            border: "1px solid #ebe6e7",
            color: "#ebe6e7",
            borderRadius: 6,
          }}
        />
        {/* Interpolante P(x) */}
        <Line
          data={pCurve}
          dataKey="y"
          dot={false}
          isAnimationActive={false}
          name="P(x)"
          stroke="#60a5fa"
          strokeWidth={2}
        />
        {/* f(x) real (opcional) */}
        {fCurve.length > 0 && (
          <Line
            data={fCurve}
            dataKey="y"
            dot={false}
            isAnimationActive={false}
            name="f(x)"
            stroke="#22d3ee"
            strokeWidth={2}
          />
        )}
        {/* Puntos de interpolación */}
        {pts.map((pt, i) => (
          <ReferenceDot
            key={i}
            x={pt.x}
            y={pt.y}
            r={4}
            fill="#f59e0b"
            stroke="#f59e0b"
          />
        ))}
        {/* Ejes */}
        <ReferenceLine y={0} stroke="#ffffff40" ifOverflow="extendDomain" />
        <ReferenceLine x={0} stroke="#ffffff40" ifOverflow="extendDomain" />
        {/* Brush */}
        {(pCurve.length > 0 || fCurve.length > 0) && (
          <Brush
            dataKey="x"
            height={26}
            tickFormatter={(v) => Number(v).toFixed(3)}
            travellerWidth={10}
            onChange={onBrushChange}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <DefaultLayout>
      <section className="grid grid-rows-[50%_auto_50%] border-r border-gray-200">
        <div className="flex flex-col w-full gap-4 py-8 md:py-4">
          <h1 className="text-2xl font-bold text-center">
            Interpolación de Lagrange
          </h1>
          <div className="flex flex-col w-full p-4 gap-4 max-h-full overflow-y-auto">
            {/* Inputs para agregar puntos */}
            <div className="flex gap-2 items-end">
              <Input
                className="w-1/3"
                label="X"
                labelPlacement="outside-top"
                placeholder="Valor X"
                radius="sm"
                type="number"
                value={currentX}
                variant="bordered"
                onChange={(e) => setCurrentX(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && canAddPoint && addPoint()
                }
              />
              <Input
                className="w-1/3"
                label="Y"
                labelPlacement="outside-top"
                placeholder="Valor Y"
                radius="sm"
                type="number"
                value={currentY}
                variant="bordered"
                onChange={(e) => setCurrentY(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && canAddPoint && addPoint()
                }
              />
              <Button
                className="w-1/3 !text-gray-200 !bg-[#052814]"
                isDisabled={!canAddPoint}
                radius="sm"
                onPress={addPoint}
              >
                Agregar
              </Button>
            </div>

            {/* Tabla de puntos */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">
                  Puntos agregados ({pairs.length})
                </h3>
                <div className="flex gap-2">
                  {pairs.length > 0 && (
                    <Button
                      className="!text-blue-600 !bg-blue-50"
                      size="sm"
                      radius="sm"
                      onPress={() => {
                        if (selectedRows.size === pairs.length) {
                          setSelectedRows(new Set());
                        } else {
                          setSelectedRows(
                            new Set(pairs.map((_, index) => index.toString()))
                          );
                        }
                      }}
                    >
                      {selectedRows.size === pairs.length
                        ? "Deseleccionar"
                        : "Seleccionar"}{" "}
                      todos
                    </Button>
                  )}
                  {selectedRows.size > 0 && (
                    <Button
                      className="!text-red-600 !bg-red-50"
                      size="sm"
                      radius="sm"
                      onPress={removeSelectedPoints}
                    >
                      Eliminar ({selectedRows.size})
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-32 overflow-y-auto border rounded">
                <Table
                  aria-label="Tabla de puntos"
                  selectionMode="multiple"
                  selectedKeys={selectedRows}
                  onSelectionChange={handleSelectionChange}
                  classNames={{
                    wrapper: "shadow-none",
                    table: "min-h-0",
                  }}
                >
                  <TableHeader>
                    <TableColumn>X</TableColumn>
                    <TableColumn>Y</TableColumn>
                  </TableHeader>
                  <TableBody
                    items={pairs.map((pair, index) => ({
                      ...pair,
                      key: index.toString(),
                    }))}
                  >
                    {(item) => (
                      <TableRow key={item.key}>
                        <TableCell>{item.x}</TableCell>
                        <TableCell>{item.y}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Input
              className="max-w-[100%]"
              label="f(x) opcional (para comparar errores)"
              labelPlacement="outside-top"
              placeholder="ej: x^3 - 2x - 5"
              radius="sm"
              value={fx}
              variant="bordered"
              onChange={(e) => setFx(e.target.value)}
            />

            <Form onSubmit={onSubmit}>
              <Button
                className="w-full mt-2 !text-gray-200 !bg-[#052814]"
                isDisabled={loading || pairs.length === 0}
                isLoading={loading}
                radius="sm"
                type="submit"
                variant="flat"
              >
                {loading
                  ? "Calculando..."
                  : `Calcular (${pairs.length} puntos)`}
              </Button>
            </Form>
          </div>
        </div>
        <Divider className="bg-gray-200" />
        <div className="p-4 flex flex-col h-full min-h-0">
          <h2 className="text-xl font-bold mb-4">Resultados</h2>
          {/* Mostrar errores */}
          {error && (
            <h3 className="text-red-500 text-md mt-2 p-2 bg-red-50 rounded">
              Error: {error}
            </h3>
          )}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Mostrar resultados */}
            {data && (
              <div className="flex flex-col gap-3 mt-2 flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="flex gap-4">
                  <Input
                    readOnly
                    className="w-1/2"
                    label="Grado del polinomio"
                    labelPlacement="outside-top"
                    radius="sm"
                    value={(data.extras.bases.length - 1).toString()}
                    variant="bordered"
                  />
                  <Input
                    readOnly
                    className="w-1/2"
                    label="Número de puntos"
                    labelPlacement="outside-top"
                    radius="sm"
                    value={data.extras.bases.length.toString()}
                    variant="bordered"
                  />
                </div>

                {data.extras.errores && (
                  <div className="flex gap-4">
                    <Input
                      readOnly
                      className="w-1/2"
                      label="Error máximo absoluto"
                      labelPlacement="outside-top"
                      radius="sm"
                      value={
                        data.extras.errores.max_abs_error?.toExponential(6) ??
                        "N/A"
                      }
                      variant="bordered"
                    />
                    <Input
                      readOnly
                      className="w-1/2"
                      label="RMSE"
                      labelPlacement="outside-top"
                      radius="sm"
                      value={
                        data.extras.errores.rmse?.toExponential(6) ?? "N/A"
                      }
                      variant="bordered"
                    />
                  </div>
                )}

                <Input
                  readOnly
                  className="max-w-[100%]"
                  label="Polinomio P(x)"
                  labelPlacement="outside-top"
                  radius="sm"
                  value={data.extras.polinomio.expr}
                  variant="bordered"
                />

                {/* Bases de Lagrange */}
                <div className="flex flex-col mt-4">
                  <h3 className="text-lg font-semibold mb-2">
                    Bases de Lagrange Lᵢ(x)
                  </h3>
                  <div className="flex flex-col gap-2 h-fit pb-4">
                    {data.extras.bases.map((base) => (
                      <Card
                        key={base.i}
                        className="border-1 border-gray-200 shadow-sm"
                        radius="sm"
                      >
                        <CardBody className="p-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-gray-200 text-sm">
                              L₍{base.i}₎(x) =
                            </span>
                            <span className="text-gray-600 font-mono text-xs break-all leading-relaxed">
                              {base.expr}
                            </span>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="grid grid-rows-[50%_auto_50%]">
        <div className="flex items-center justify-center p-4">
          <div className="w-full h-full flex flex-col">
            <div className="flex gap-2 mb-2">
              <HTooltip content="Zoom +" className="bg-gray-600" showArrow>
                <Button
                  size="sm"
                  startContent={<ZoomIn size={16} />}
                  onPress={() => zoomAround(1 / 1.5)}
                >
                  Zoom +
                </Button>
              </HTooltip>
              <HTooltip content="Zoom −" className="bg-gray-600" showArrow>
                <Button
                  size="sm"
                  startContent={<ZoomOut size={16} />}
                  onPress={() => zoomAround(1.5)}
                >
                  Zoom −
                </Button>
              </HTooltip>
              <HTooltip
                content="Reiniciar zoom"
                className="bg-gray-600"
                showArrow
              >
                <Button
                  size="sm"
                  startContent={<RotateCcw size={16} />}
                  onPress={resetZoom}
                >
                  Reset
                </Button>
              </HTooltip>
              <HTooltip
                content="Pantalla completa"
                className="bg-gray-600"
                showArrow
              >
                <Button
                  size="sm"
                  startContent={<Expand size={16} />}
                  onPress={onOpen}
                >
                  Expandir
                </Button>
              </HTooltip>
            </div>
            <div className="flex-1" onWheel={onWheel}>
              {renderChart()}
            </div>
          </div>
        </div>
        <Divider className="bg-gray-200" />
        <div className="p-4 flex flex-col h-full">
          <h2 className="text-xl font-bold mb-4">Tabla de Puntos</h2>
          <div className="flex-1 min-h-0">
            <Table
              isHeaderSticky
              isStriped
              aria-label="Tabla de puntos de Lagrange"
              classNames={{
                base: "overflow-y-auto max-h-full",
                thead:
                  "[&>tr]:first:backdrop-blur-md [&>tr]:first:bg-white/90 [&>tr]:first:border-b [&>tr]:first:border-gray-200 [&>tr]:first:shadow-sm",
              }}
            >
              <TableHeader>
                <TableColumn className="bg-[#052814] text-gray-200">
                  x
                </TableColumn>
                <TableColumn className="bg-[#052814] text-gray-200">
                  y
                </TableColumn>
                <TableColumn className="bg-[#052814] text-gray-200">
                  P(x)
                </TableColumn>
              </TableHeader>
              <TableBody items={data?.extras.tabla ?? []}>
                {(row) => (
                  <TableRow key={`${row.x}`}>
                    <TableCell>{row.x}</TableCell>
                    <TableCell>{row.y}</TableCell>
                    <TableCell>{row["P(x)"]}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* ------- MODAL AMPLIADO ------- */}
      <Modal
        hideCloseButton
        backdrop="blur"
        isOpen={isOpen}
        placement="center"
        onOpenChange={onOpenChange}
      >
        <ModalContent className="bg-[#0b0b0b] text-[#ebe6e7] max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] p-2">
          {(close) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <span className="font-semibold">
                  Interpolación de Lagrange — Vista ampliada
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
                      startContent={<Close color="#ebe6e7" size={16} />}
                      variant="ghost"
                      onPress={close}
                    />
                  </HTooltip>
                </div>
              </ModalHeader>

              <ModalBody className="p-2">
                <div className="w-full h-[78vh]" onWheel={onWheel}>
                  {renderChart()}
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
