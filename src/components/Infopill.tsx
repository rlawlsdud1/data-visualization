import type { ReactNode } from "react";

const Infopill = ({ children }: { children: ReactNode }) => {
  return (
    <div className="pb-6">
      <p className="text-2xl md:text-4xl font-bold leading-tight">{children}</p>
    </div>
  );
};
export default Infopill;
