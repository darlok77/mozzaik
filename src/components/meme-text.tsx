import type { FC, ReactNode } from "react";
import { useDrag } from "react-dnd";

export interface BoxProps {
  id: string;
  left: number;
  top: number;
  children?: ReactNode;
  canDrag?: boolean;
  dataTestId?: string;
  number?: number;
}

export const MemeText: FC<BoxProps> = ({
  id,
  top,
  left,
  children,
  canDrag,
  dataTestId,
  number,
}) => {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "box",
      item: { id, top, left },
      canDrag: canDrag,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id, top, left]
  );

  if (isDragging) {
    return <div ref={drag} />;
  }
  return (
    <div
      className="box"
      ref={drag}
      style={{
        top,
        left,
        cursor: canDrag ? "move" : "default",
        position: "absolute",
        color: "white",
        fontFamily: "Impact",
        fontWeight:"bold",
        userSelect: "none",
        textTransform:"uppercase"
    }}
      data-testid={`${dataTestId}-text-${number}`}
    >
      {children}
    </div>
  );
};
