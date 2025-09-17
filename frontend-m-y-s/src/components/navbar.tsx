import {
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Navbar,
  NavbarContent,
  NavbarItem,
} from "@heroui/react";

import {
  Activity,
  ChevronDown,
  Flash,
  Lock,
  Scale,
  Server,
  TagUser,
} from "./icons";

export default function NavbarComponent() {
  const icons = {
    chevron: <ChevronDown fill="currentColor" size={16} />,
    scale: <Scale className="text-warning" fill="currentColor" size={30} />,
    lock: <Lock className="text-success" fill="currentColor" size={30} />,
    activity: (
      <Activity className="text-secondary" fill="currentColor" size={30} />
    ),
    flash: <Flash className="text-primary" fill="currentColor" size={30} />,
    server: <Server className="text-success" fill="currentColor" size={30} />,
    user: <TagUser className="text-danger" fill="currentColor" size={30} />,
  };

  return (
    <>
      <Navbar
        classNames={{
          base: "bg-transparent",
          wrapper: "max-w-fit",
        }}
      >
        <NavbarContent className="hidden sm:flex gap-4 !w-fit" justify="center">
          <Dropdown aria-label="Métodos Numéricos" className="w-64">
            <NavbarItem>
              <DropdownTrigger>
                <Button
                  disableRipple
                  className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                  endContent={icons.chevron}
                  radius="sm"
                  variant="light"
                >
                  Métodos Numéricos
                </Button>
              </DropdownTrigger>
            </NavbarItem>
            <DropdownMenu
              aria-label="Métodos numéricos"
              itemClasses={{
                base: "gap-4",
                description: "whitespace-normal text-wrap",
              }}
            >
              <DropdownItem
                key="binary-search"
                description="Sirve para encontrar la raíz de una f(x) continua en un intervalo [a,b]"
                href="/numericMethods/binarySearch"
                startContent={icons.scale}
              >
                Búsqueda Binaria
              </DropdownItem>
              <DropdownItem
                key="fixed-point"
                description="Sirve para encontrar la raíz de una f(x) continua. Se debe cumplir g(x)= x"
                href="/numericMethods/fixedPoint"
                startContent={icons.activity}
              >
                Punto Fijo
              </DropdownItem>
              <DropdownItem
                key="aikten"
                description="Toma de base el método de punto fijo. Cada 3 iteraciones se evalúa la función g(x) en x0*"
                href="/numericMethods/aikten"
                startContent={icons.flash}
              >
                Aikten
              </DropdownItem>
              <DropdownItem
                key="newton-raphson"
                description="Método iterativo que encuentra la raíz de una f(x) no lineal. Se basa en la aproximación lineal de la función mediante su derivada"
                href="/numericMethods/newtonRaphson"
                startContent={icons.server}
              >
                Newton-Raphson
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <Dropdown>
            <NavbarItem>
              <DropdownTrigger>
                <Button
                  disableRipple
                  className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                  endContent={icons.chevron}
                  radius="sm"
                  variant="light"
                >
                  Aproximaciones
                </Button>
              </DropdownTrigger>
            </NavbarItem>
            <DropdownMenu
              aria-label="ACME features"
              itemClasses={{
                base: "gap-4",
                description: "whitespace-normal text-wrap",
              }}
            >
              <DropdownItem
                key="lagrange"
                description="ACME scales apps based on demand and load"
                startContent={icons.scale}
              >
                Lagrange
              </DropdownItem>
              <DropdownItem
                key="differences"
                description="Real-time metrics to debug issues"
                startContent={icons.activity}
              >
                Diferencias finitas
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <Dropdown>
            <NavbarItem>
              <DropdownTrigger>
                <Button
                  disableRipple
                  className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                  endContent={icons.chevron}
                  radius="sm"
                  variant="light"
                >
                  Integraciones numéricas
                </Button>
              </DropdownTrigger>
            </NavbarItem>
            <DropdownMenu
              aria-label="ACME features"
              itemClasses={{
                base: "gap-4",
                description: "whitespace-normal text-wrap",
              }}
            >
              <DropdownItem
                key="trapezoidal"
                description="ACME scales apps based on demand and load"
                startContent={icons.scale}
              >
                Integración por trapecios
              </DropdownItem>
              <DropdownItem
                key="trapezoidal"
                description="ACME scales apps based on demand and load"
                startContent={icons.scale}
              >
                Integración por trapecios
              </DropdownItem>
              <DropdownItem
                key="simpson"
                description="Real-time metrics to debug issues"
                startContent={icons.activity}
              >
                Integración por Simpson
              </DropdownItem>
              <DropdownItem
                key="monte-carlo"
                description="Real-time metrics to debug issues"
                startContent={icons.activity}
              >
                Integración por Monte Carlo
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarContent>
      </Navbar>
      <Divider className="w-full bg-gray-200" />
    </>
  );
}
