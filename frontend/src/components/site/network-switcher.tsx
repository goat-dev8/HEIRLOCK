import { useNetwork } from "@/lib/network-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export function NetworkSwitcher() {
  const [network, setNetwork] = useNetwork();
  const isMainnet = network === "mainnet";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 font-mono text-xs">
          <span
            className={
              "inline-block h-1.5 w-1.5 rounded-full " +
              (isMainnet ? "bg-success shadow-[0_0_6px_var(--color-success)]" : "bg-warning")
            }
          />
          {isMainnet ? "Mainnet" : "Testnet"}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setNetwork("mainnet")}>
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-success" /> ValueChain Mainnet
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setNetwork("testnet")}>
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-warning" /> ValueChain Testnet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}