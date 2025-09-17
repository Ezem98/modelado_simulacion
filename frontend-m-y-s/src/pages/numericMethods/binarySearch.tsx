import {
  Button,
  Divider,
  Form,
  getKeyValue,
  Input,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useState } from "react";

import DefaultLayout from "@/layouts/default";
import {
  numericMethodsAPI,
  useApiCall,
  type BinarySearchResponse,
} from "@/services/api";

export default function BinarySearchPage() {
  const [functionLatex, setFunctionLatex] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [tolerance, setTolerance] = useState("0.00000001");
  const [iterations, setIterations] = useState("50");

  const { loading, error, data, execute } = useApiCall<BinarySearchResponse>();

  const columns = [
    {
      key: "iteracion",
      label: "Iteración",
    },
    {
      key: "a",
      label: "A",
    },
    {
      key: "b",
      label: "B",
    },
    {
      key: "fa",
      label: "FA",
    },
    {
      key: "fb",
      label: "FB",
    },
    {
      key: "media",
      label: "Media",
    },
    {
      key: "fmedia",
      label: "FMedia",
    },
    {
      key: "error_absoluto",
      label: "Error Absoluto",
    },
    {
      key: "error_relativo",
      label: "Error Relativo",
    },
  ];

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await execute(() =>
        numericMethodsAPI.binarySearch({
          func: functionLatex,
          a: parseFloat(a),
          b: parseFloat(b),
          tol: parseFloat(tolerance),
          max_iter: parseInt(iterations),
        })
      );
    } catch (err) {
      throw err;
    }
  };

  return (
    <DefaultLayout>
      <section className="grid grid-rows-[1fr_auto_1fr] items-center border-r border-gray-200">
        <div className="flex flex-col w-full gap-4 py-8 md:py-4">
          <h1 className="text-2xl font-bold text-center">Búsqueda Binaria</h1>
          <Form className="flex flex-col w-full p-4 gap-4" onSubmit={onSubmit}>
            <Input
              className="max-w-[100%]"
              label="F(x) (Función dada)"
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
                label="Extremo a"
                labelPlacement="outside-top"
                placeholder="Ingrese el extremo a"
                radius="sm"
                type="number"
                value={a}
                variant="bordered"
                onChange={(e) => setA(e.target.value)}
              />
              <Input
                className="w-1/2"
                label="Extremo b"
                labelPlacement="outside-top"
                placeholder="Ingrese el extremo b"
                radius="sm"
                type="number"
                value={b}
                variant="bordered"
                onChange={(e) => setB(e.target.value)}
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
              className="w-full mt-2 !text-gray-200"
              color="success"
              isDisabled={loading || !functionLatex || !a || !b}
              isLoading={loading}
              radius="sm"
              type="submit"
              variant="flat"
            >
              {loading ? "Calculando..." : "Calcular"}
            </Button>
          </Form>
        </div>
        <Divider className="bg-gray-200" />
        <div className="flex flex-col p-4 h-full w-full">
          <h2 className="text-xl text-start font-bold">Resultados</h2>
          {/* Mostrar errores */}
          {error && (
            <h3 className="text-red-500 text-md mt-2 p-2 bg-red-50 rounded">
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
                  value={data.resultado.iteraciones.length.toString()}
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
      <section className="grid grid-rows-[1fr_auto_1fr]">
        <div className="flex flex-grow"></div>
        <Divider className="bg-gray-200" />
        <div className="flex flex-grow p-4 flex-col">
          <h2 className="text-xl font-bold mb-4">Tabla de Iteraciones</h2>
          <Table aria-label="Example table with dynamic content">
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn key={column.key}>{column.label}</TableColumn>
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
      </section>
    </DefaultLayout>
  );
}
