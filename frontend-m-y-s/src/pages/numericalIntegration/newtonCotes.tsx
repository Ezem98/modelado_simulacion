import {
  Button,
  Divider,
  Form,
  Tooltip as HTooltip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Switch,
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
  Area,
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

import DefaultLayout from "@/layouts/default";
import { useApiCall } from "@/services/api";
import { IntegrationMethodType } from "@/types";
import { INTEGRATION_METHODS } from "@/utils/const";
import { Expand, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

/** ===== Payload de integración ===== */
type IntegrationResponse = {
  metodo: "integracion";
  resultado: {
    I: number;
    integral_simbolica?: string | null;
    error_teorico?: { formula: string; cota: number | null } | null;
    tabla: { i: number; x: number; fx: number; w?: number | null }[];
    grafico: {
      x_range: [number, number];
      y_range?: [number, number] | null;
      f_curve: { x: number; y: number }[];
      nodes: { x: number; y: number; w?: number }[];
      area_bajo_curva?: { x: number; y: number }[];
      fills?: {
        xs: number[];
        ys: number[];
        kind: "rect" | "curve";
        i: number;
      }[];
    };
  };
  detalles?: {
    regla?: string; // viene del back como "Trapecio", "Simpson 1/3", etc.
    a?: number;
    b?: number;
    n?: number;
    n_ajustado?: number;
    h?: number | null;
  };
};

const RULE_MAP: Record<IntegrationMethodType, string> = {
  rectangle: "rectangle",
  trapezoid: "trapezoid",
  simpson_1_3: "simpson_1_3",
  simpson_3_8: "simpson_3_8",
  boole: "boole",
  "gauss-legendre": "gauss_legendre",
};

export default function NewtonCotesPage() {
  const [functionLatex, setFunctionLatex] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [n, setN] = useState("5");
  const [method, setMethod] = useState<IntegrationMethodType>("rectangle");
  const [showAreas, setShowAreas] = useState(true);

  const { loading, error, data, execute } = useApiCall<IntegrationResponse>();

  // --- Datos de gráfico del backend ---
  const xRange = data?.resultado?.grafico?.x_range as
    | [number, number]
    | undefined;
  const rawFCurve = (data?.resultado?.grafico?.f_curve ?? []) as Array<{
    x: number;
    y: number;
  }>;
  const rawAreaUnder = (data?.resultado?.grafico?.area_bajo_curva ??
    []) as Array<{ x: number; y: number }>;
  const nodes = (data?.resultado?.grafico?.nodes ?? []) as Array<{
    x: number;
    y: number;
    w?: number;
  }>;
  // Usar versión simplificada para el gráfico
  const fCurve = useMemo(() => downsample(rawFCurve, 500), [rawFCurve]);
  const areaUnder = useMemo(
    () => downsample(rawAreaUnder, 500),
    [rawAreaUnder]
  );
  const fillsRaw = (data?.resultado?.grafico?.fills ?? []) as Array<{
    xs: number[];
    ys: number[];
    kind: "rect" | "curve";
    i: number;
  }>;

  // Normalizo fills a series [{x,y}] para <Area/>
  const fills = useMemo<Array<{ x: number; y: number }>>(() => {
    const out: Array<{ x: number; y: number }> = [];
    (fillsRaw || []).forEach((seg) => {
      if (seg.kind === "rect") {
        const left = seg.xs[0];
        const right = seg.xs[2];
        const y = seg.ys[1];
        out.push({ x: left, y }, { x: right, y });
      } else {
        seg.xs.forEach((x, i) => out.push({ x, y: seg.ys[i] }));
      }
    });
    return out;
  }, [fillsRaw]);

  // --- Rango X global y dominio visible ---
  const fullRange = useMemo<[number, number]>(
    () => xRange ?? [-1, 1],
    [xRange?.[0], xRange?.[1]]
  );
  const [domain, setDomain] = useState<[number, number]>(fullRange);

  // --- Auto-fit de Y según lo visible ---
  const yDomain = useMemo<[number, number]>(() => {
    const pool = [...fCurve, ...nodes];
    if (!pool.length) return [-1, 1];

    const [minX, maxX] =
      domain[0] <= domain[1]
        ? domain
        : ([domain[1], domain[0]] as [number, number]);

    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const p of pool) {
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

    minY = Math.min(minY, 0);
    maxY = Math.max(maxY, 0);
    const pad = 0.08 * Math.max(1, Math.abs(maxY - minY));
    return [minY - pad, maxY + pad];
  }, [fCurve, nodes, domain]);

  useEffect(() => {
    setDomain(fullRange);
  }, [fullRange[0], fullRange[1]]);

  const lastMouseXRef = useRef<number | null>(null);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  function downsample<T>(arr: T[], maxPoints = 500): T[] {
    if (arr.length <= maxPoints) return arr;
    const step = Math.ceil(arr.length / maxPoints);
    return arr.filter((_, i) => i % step === 0);
  }

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

  const zoomAround = (factor: number, anchor?: number) => {
    const [min, max] = domain;
    const cx = anchor ?? (min + max) / 2;
    const w = (max - min) * factor;
    setDomain(clampDomain(cx - w / 2, cx + w / 2));
  };

  const resetZoom = () => setDomain(fullRange);

  const onBrushChange = (range: any) => {
    if (!range || !fCurve.length) return;
    const s = Math.max(0, Math.min(range.startIndex ?? 0, fCurve.length - 1));
    const e = Math.max(0, Math.min(range.endIndex ?? 0, fCurve.length - 1));
    const newMin = fCurve[Math.min(s, e)].x;
    const newMax = fCurve[Math.max(s, e)].x;
    setDomain(clampDomain(newMin, newMax));
  };

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

  // --- Submit: llama a la lambda de integración ---
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const regla = RULE_MAP[method];

    await execute(() =>
      fetch(import.meta.env.VITE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metodo: "integracion",
          regla,
          func: functionLatex, // <— IMPORTANTE: el back espera 'func'
          a: a, // texto: permite "pi", "π", etc.
          b: b,
          n: parseInt(n, 10),
          show_areas: showAreas,
          samples: 1500,
        }),
      }).then((r) => r.json())
    );
  };

  // --- Chart reusable (normal + modal) ---
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
          domain={yDomain}
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

        {/* Área global bajo f(x) */}
        {showAreas && areaUnder.length > 0 && (
          <Area
            data={areaUnder}
            dataKey="y"
            baseValue={0}
            isAnimationActive={false}
            stroke="none"
            fill="rgba(56, 189, 248, 0.18)" // celeste suave
          />
        )}

        {/* Fills por subintervalo (rectángulos, trapecios, curvas) */}
        {showAreas && fills.length > 0 && (
          <Area
            data={fills}
            dataKey="y"
            baseValue={0}
            isAnimationActive={false}
            stroke="none"
            fill="rgba(245, 158, 11, 0.35)" // naranja suave
          />
        )}

        {/* Nodos */}
        {nodes.map((pt, i) => (
          <ReferenceDot
            key={i}
            x={pt.x}
            y={pt.y}
            r={4}
            fill="#ef4444"
            stroke="#ef4444"
          />
        ))}

        {/* Ejes */}
        <ReferenceLine y={0} stroke="#ffffff55" ifOverflow="extendDomain" />
        <ReferenceLine x={0} stroke="#ffffff55" ifOverflow="extendDomain" />

        {/* Brush */}
        {fCurve.length > 0 && fCurve.length < 1000 && (
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

  /** ================= RENDER ================= */
  return (
    <DefaultLayout>
      {/* ========= FORM ========= */}
      <section className="grid grid-rows-[50%_auto_50%] border-r border-gray-600">
        <div className="flex flex-col w-full py-8 md:py-4">
          <h1 className="text-2xl font-bold text-center text-white">
            Newton–Cotes / Gauss
          </h1>

          <div className="grid grid-rows-[1fr_auto] w-full p-4 h-full">
            <div className="flex-1 overflow-y-auto pr-2">
              <Form
                className="flex flex-col w-full gap-4"
                id="integration-form"
                onSubmit={onSubmit}
              >
                <Select
                  isClearable
                  className="max-w-[100%]"
                  classNames={{
                    trigger:
                      "bg-[#020617] border-gray-600 data-[hover=true]:bg-gray-700",
                    listbox: "bg-[#020617]",
                    popoverContent: "bg-[#212121] border-gray-600",
                    value: "text-gray-200",
                    label: "text-gray-200",
                  }}
                  label="Método de integración"
                  labelPlacement="outside"
                  placeholder="Seleccione el método"
                  radius="sm"
                  selectedKeys={[method]}
                  variant="bordered"
                  onChange={(e) =>
                    setMethod(e.target.value as IntegrationMethodType)
                  }
                >
                  {INTEGRATION_METHODS.map((m) => (
                    <SelectItem key={m.value}>{m.label}</SelectItem>
                  ))}
                </Select>

                <Input
                  className="max-w-[100%]"
                  label="f(x)"
                  labelPlacement="outside-top"
                  placeholder="Ej: sin(x)   |   x^3 - 2x - 5"
                  radius="sm"
                  value={functionLatex}
                  variant="bordered"
                  onChange={(e) => setFunctionLatex(e.target.value)}
                />

                <div className="flex w-full h-fit items-end gap-4">
                  <Input
                    className="w-1/2"
                    label="Límite inferior (a)"
                    labelPlacement="outside-top"
                    placeholder="Ej: 0"
                    radius="sm"
                    // TEXTO para permitir 'pi', 'π', etc.
                    type="text"
                    value={a}
                    variant="bordered"
                    onChange={(e) => setA(e.target.value)}
                  />
                  <Input
                    className="w-1/2"
                    label="Límite superior (b)"
                    labelPlacement="outside-top"
                    placeholder="Ej: pi"
                    radius="sm"
                    type="text"
                    value={b}
                    variant="bordered"
                    onChange={(e) => setB(e.target.value)}
                  />
                </div>

                <div className="flex w-full gap-4 items-end">
                  <Input
                    className="w-1/2"
                    label="n (subintervalos / puntos)"
                    labelPlacement="outside-top"
                    placeholder="Ej: 5"
                    radius="sm"
                    type="number"
                    value={n}
                    variant="bordered"
                    onChange={(e) => setN(e.target.value)}
                  />
                  <Switch
                    color="secondary"
                    isSelected={showAreas}
                    onValueChange={setShowAreas}
                  >
                    Mostrar áreas
                  </Switch>
                </div>
              </Form>
            </div>

            <Button
              className="w-full my-4 !text-gray-200 !bg-[#052814]"
              form="integration-form"
              isDisabled={loading || !functionLatex || !a || !b}
              isLoading={loading}
              radius="sm"
              type="submit"
              variant="flat"
            >
              {loading ? "Calculando..." : "Calcular"}
            </Button>
          </div>
        </div>

        <Divider className="bg-gray-600" />

        {/* ========= RESULTADOS ========= */}
        <div className="flex flex-col p-4 h-full w-full min-h-0">
          <h2 className="text-xl text-start font-bold text-white">
            Resultados
          </h2>

          {error && (
            <h3 className="text-red-400 text-md mt-2 p-2 bg-red-900/20 rounded">
              Error: {error}
            </h3>
          )}

          {data && (
            <div className="mt-2 flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
              <div className="flex gap-4">
                <Input
                  readOnly
                  className="w-1/2"
                  label="Resultado numérico (I)"
                  labelPlacement="outside-top"
                  radius="sm"
                  value={data.resultado.I?.toPrecision(12)}
                  variant="bordered"
                />
                <Input
                  readOnly
                  className="w-1/2"
                  label="Método"
                  labelPlacement="outside-top"
                  radius="sm"
                  value={data.detalles?.regla ?? ""}
                  variant="bordered"
                />
              </div>

              <div className="flex gap-4">
                <Input
                  readOnly
                  className="w-1/2"
                  label="a"
                  labelPlacement="outside-top"
                  radius="sm"
                  value={`${data.detalles?.a ?? ""}`}
                  variant="bordered"
                />
                <Input
                  readOnly
                  className="w-1/2"
                  label="b"
                  labelPlacement="outside-top"
                  radius="sm"
                  value={`${data.detalles?.b ?? ""}`}
                  variant="bordered"
                />
              </div>

              <Input
                readOnly
                className="max-w-[100%]"
                label="Integral simbólica"
                labelPlacement="outside-top"
                radius="sm"
                value={data.resultado.integral_simbolica ?? "—"}
                variant="bordered"
              />

              {data.resultado.error_teorico && (
                <div className="flex gap-4">
                  <Input
                    readOnly
                    className="w-2/3"
                    label="Error teórico (fórmula)"
                    labelPlacement="outside-top"
                    radius="sm"
                    value={data.resultado.error_teorico.formula}
                    variant="bordered"
                  />
                  <Input
                    readOnly
                    className="w-1/3"
                    label="Error teórico (cota)"
                    labelPlacement="outside-top"
                    radius="sm"
                    value={
                      data.resultado.error_teorico.cota != null
                        ? Math.abs(
                            Number(data.resultado.error_teorico.cota)
                          ).toExponential(6)
                        : "N/D"
                    }
                    variant="bordered"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========= GRÁFICO + CONTROLES ========= */}
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

        {/* ========= TABLA DE NODOS ========= */}
        <div className="p-4 flex flex-col h-full">
          <h2 className="text-xl font-bold mb-4 text-white">Tabla de nodos</h2>
          <div className="flex-1 min-h-0">
            <Table
              isHeaderSticky
              isStriped
              aria-label="Tabla de nodos de integración"
              classNames={{ base: "overflow-y-auto max-h-full" }}
            >
              <TableHeader>
                <TableColumn className="bg-[#052814] text-gray-200">
                  i
                </TableColumn>
                <TableColumn className="bg-[#052814] text-gray-200">
                  x
                </TableColumn>
                <TableColumn className="bg-[#052814] text-gray-200">
                  f(x)
                </TableColumn>
                <TableColumn className="bg-[#052814] text-gray-200">
                  Peso wᵢ
                </TableColumn>
              </TableHeader>
              <TableBody items={data?.resultado.tabla.slice(0, 5) ?? []}>
                {(row: any) => (
                  <TableRow key={`${row.i}-${row.x}`}>
                    <TableCell>{row.i}</TableCell>
                    <TableCell>{row.x}</TableCell>
                    <TableCell>{row.fx}</TableCell>
                    <TableCell>{row.w ?? ""}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* ========= MODAL AMPLIADO ========= */}
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
                  Integración — Vista ampliada
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
