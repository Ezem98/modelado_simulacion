// src/pages/numericMethods/NewtonRaphsonPage.tsx
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
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  NewtonRaphsonResponse,
  numericMethodsAPI,
  useApiCall,
} from "@/services/api";
import { Expand, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

import DefaultLayout from "@/layouts/default";

export default function NewtonRaphsonPage() {
  const [functionLatex, setFunctionLatex] = useState("");
  const [derivativeLatex, setDerivativeLatex] = useState("");
  const [x0, setX0] = useState("");
  const [tolerance, setTolerance] = useState("0.00000001");
  const [iterations, setIterations] = useState("50");
  const [expectedRoot, setExpectedRoot] = useState("");

  const { loading, error, data, execute } = useApiCall<NewtonRaphsonResponse>();

  // Accesos cómodos al gráfico
  const xRange = data?.extras?.grafico?.x_range as [number, number] | undefined;
  const fCurve = (data?.extras?.grafico?.f_curve ?? []) as Array<{
    x: number;
    y: number;
  }>;

  // Rango X global provisto por el backend
  const fullRange = useMemo<[number, number]>(
    () => xRange ?? [-1, 1],
    [xRange?.[0], xRange?.[1]]
  );
  const [domain, setDomain] = useState<[number, number]>(fullRange);

  // Auto-ajuste de Y según el X visible (estilo GeoGebra)
  const yDomain = useMemo<[number, number]>(() => {
    if (!fCurve.length) return [-1, 1];

    const [minX, maxX] =
      domain[0] <= domain[1]
        ? domain
        : ([domain[1], domain[0]] as [number, number]);

    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const p of fCurve) {
      if (p.x >= minX && p.x <= maxX) {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }

    if (!isFinite(minY) || !isFinite(maxY)) return [-1, 1];
    if (minY === maxY) {
      const eps = Math.max(1, Math.abs(minY) * 0.1);
      minY -= eps;
      maxY += eps;
    }

    // Mantener visible el eje X
    minY = Math.min(minY, 0);
    maxY = Math.max(maxY, 0);

    const pad = 0.08 * Math.max(1, Math.abs(maxY - minY));
    return [minY - pad, maxY + pad];
  }, [fCurve, domain]);

  // Sincroniza el domain cuando llega una nueva curva
  useEffect(() => {
    setDomain(fullRange);
  }, [fullRange[0], fullRange[1]]);

  const lastMouseXRef = useRef<number | null>(null);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  // Columnas para la tabla
  const columns = [
    { key: "iteracion", label: "Iteración" },
    { key: "x0", label: "X0" },
    { key: "fx", label: "f(x0)" },
    { key: "dfx", label: "f'(x0)" },
    { key: "x1", label: "X1" },
    { key: "error_absoluto", label: "Error Absoluto" },
    { key: "error_relativo", label: "Error Relativo" },
    { key: "f_en_x1", label: "f(X1)" },
  ];

  // --- Zoom helpers ---
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

  // factor < 1 => zoom in ; factor > 1 => zoom out
  const zoomAround = (factor: number, anchor?: number) => {
    const [min, max] = domain;
    const cx = anchor ?? (min + max) / 2;
    const w = (max - min) * factor;
    setDomain(clampDomain(cx - w / 2, cx + w / 2));
  };

  const resetZoom = () => setDomain(fullRange);

  // Brush (zoom por selección de rango usando índices en fCurve)
  const onBrushChange = (range: any) => {
    if (
      !range ||
      range.startIndex == null ||
      range.endIndex == null ||
      !fCurve.length
    )
      return;
    const s = Math.max(0, Math.min(range.startIndex, fCurve.length - 1));
    const e = Math.max(0, Math.min(range.endIndex, fCurve.length - 1));
    const newMin = fCurve[Math.min(s, e)].x;
    const newMax = fCurve[Math.max(s, e)].x;
    setDomain(clampDomain(newMin, newMax));
  };

  // Zoom con rueda anclado al cursor
  const onWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
    const anchor = lastMouseXRef.current ?? (domain[0] + domain[1]) / 2;
    zoomAround(factor, anchor);
  };

  const onMouseMove = (state: any) => {
    if (state && typeof state.activeLabel === "number") {
      lastMouseXRef.current = state.activeLabel;
    }
  };

  // Submit
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await execute(() =>
      numericMethodsAPI.newtonRaphson({
        func: functionLatex,
        df: derivativeLatex, // opcional; si está vacío, la Lambda deriva
        x0: parseFloat(x0),
        tol: parseFloat(tolerance),
        max_iter: parseInt(iterations, 10),
        graph_mode: "geogebra",
        x_min: -15,
        x_max: 15,
        samples: 1500,
      })
    );
  };

  // Reusar el mismo chart en normal y modal
  const renderChart = () => (
    <ResponsiveContainer height="100%" width="100%">
      <LineChart data={fCurve} onMouseMove={onMouseMove}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
        <XAxis
          type="number"
          dataKey="x"
          domain={domain}
          allowDataOverflow
          tick={{ fill: "#ebe6e7", fontSize: 14 }}
        />
        <YAxis
          type="number"
          domain={yDomain} // auto-fit Y según X visible
          allowDataOverflow
          tick={{ fill: "#ebe6e7", fontSize: 14 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#121212",
            border: "1px solid #ebe6e7",
            borderRadius: "6px",
            color: "#ebe6e7",
          }}
        />

        {/* f(x) */}
        <Line
          data={fCurve}
          dataKey="y"
          dot={false}
          isAnimationActive={false}
          name="f(x)"
          stroke="#22d3ee90"
          strokeWidth={2}
        />

        {/* ejes como GeoGebra */}
        <ReferenceLine y={0} stroke="#ffffff55" ifOverflow="extendDomain" />
        <ReferenceLine x={0} stroke="#ffffff55" ifOverflow="extendDomain" />

        {/* Raíz calculada */}
        {data?.resultado?.raiz != null && (
          <ReferenceDot
            x={data.resultado.raiz}
            y={0}
            r={5}
            fill="#ef4444"
            stroke="#ef4444"
            label={{
              value: `x* ≈ ${Number(data.resultado.raiz).toFixed(6)}`,
              position: "top",
              fill: "#ebe6e7",
              fontSize: 12,
            }}
          />
        )}

        {/* Raíz esperada (opcional) */}
        {expectedRoot && !Number.isNaN(Number(expectedRoot)) && (
          <ReferenceLine
            ifOverflow="extendDomain"
            stroke="#f59e0b"
            strokeDasharray="6 6"
            x={Number(expectedRoot)}
          />
        )}

        {/* Trazas de Newton (si el backend las envía) */}
        {data?.extras?.grafico?.segmentos?.map((seg: any, i: number) => (
          <Line
            key={i}
            data={[seg.desde, seg.hasta]}
            dataKey="y"
            dot={false}
            isAnimationActive={false}
            stroke="#94a3b855"
            strokeDasharray="5 4"
          />
        ))}

        {/* Brush para zoom por selección */}
        {fCurve.length > 0 && (
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
      <section className="grid grid-rows-[50%_auto_50%] border-r border-gray-600">
        <div className="flex flex-col w-full py-8 md:py-4">
          <h1 className="text-2xl font-bold text-center text-white">
            Newton-Raphson
          </h1>
          <Form className="flex flex-col w-full p-4" onSubmit={onSubmit}>
            <Input
              className="max-w-[100%]"
              label="F(x)"
              labelPlacement="outside-top"
              placeholder="Ingrese la función (ej: x^3 - 2x - 5)"
              radius="sm"
              value={functionLatex}
              variant="bordered"
              onChange={(e) => setFunctionLatex(e.target.value)}
            />
            <Input
              className="max-w-[100%]"
              label="dF(x) (derivada) — opcional"
              labelPlacement="outside-top"
              placeholder="Si se omite, se deriva automáticamente."
              radius="sm"
              value={derivativeLatex}
              variant="bordered"
              onChange={(e) => setDerivativeLatex(e.target.value)}
            />
            <div className="flex w-full h-fit items-end gap-4">
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
              <Input
                className="w-1/2"
                label="Raíz esperada (opcional)"
                labelPlacement="outside-top"
                placeholder="Solo para comparación visual"
                radius="sm"
                type="number"
                value={expectedRoot}
                variant="bordered"
                onChange={(e) => setExpectedRoot(e.target.value)}
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
          {error && (
            <h3 className="text-red-400 text-md mt-2 p-2 bg-red-900/20 rounded">
              Error: {error}
            </h3>
          )}
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

      {/* ------- CHART + CONTROLES ------- */}
      <section className="grid grid-rows-[50%_auto_50%]">
        <div
          className="flex flex-col items-center justify-center p-4"
          onWheel={onWheel}
        >
          <div className="flex gap-2 mb-8">
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
          <div className="w-full h-[420px]">{renderChart()}</div>
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
              aria-label="Tabla de iteraciones del método de Newton-Raphson"
              classNames={{ base: "overflow-y-auto max-h-full" }}
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
                {(item: any) => (
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
                  Newton-Raphson — Vista ampliada
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
