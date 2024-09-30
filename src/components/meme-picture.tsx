import { Box, Text, useDimensions } from "@chakra-ui/react";
import { useMemo, useRef } from "react";
import { useDrop } from "react-dnd";
import type { XYCoord } from "react-dnd";
import keygen from "react-id-generator"

import { MemeText } from "./meme-text";

type DragMemeText = {
  type: string
  id: string
  top: number
  left: number
}

export type MemePictureProps = {
  pictureUrl: string;
  texts: {
    content: string;
    x: number;
    y: number;
  }[];
  dataTestId?: string;
  onChangeTexts?: (texts: MemePictureProps["texts"]) => void;
  dragableTexts?: boolean;
};

const REF_WIDTH = 800;
const REF_HEIGHT = 450;
const REF_FONT_SIZE = 36;

export const MemePicture: React.FC<MemePictureProps> = ({
  pictureUrl,
  texts: rawTexts,
  dataTestId = "",
  onChangeTexts: updateTexts = () => {},
  dragableTexts = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useDimensions(containerRef, true);
  const boxWidth = dimensions?.borderBox.width;

  const { height, fontSize, texts } = useMemo(() => {
    if (!boxWidth) {
      return { height: 0, fontSize: 0, texts: rawTexts };
    }

    return {
      height: (boxWidth / REF_WIDTH) * REF_HEIGHT,
      fontSize: (boxWidth / REF_WIDTH) * REF_FONT_SIZE,
      texts: rawTexts.map((text) => ({
        ...text,
        x: (boxWidth / REF_WIDTH) * text.x,
        y: (boxWidth / REF_WIDTH) * text.y,
      })),
    };
  }, [boxWidth, rawTexts]);

  const [, drop] = useDrop(
    () => ({
      accept: "box",
      canDrag: () => dragableTexts,
      drop(item: DragMemeText, monitor) {
        const delta = monitor.getDifferenceFromInitialOffset() as XYCoord;
        const top = Math.round(item.top + delta.y);
        const left = Math.round(item.left + delta.x);

        const newTexts = texts.map((text, i) => {
          if (i.toString() === item.id) {
            return {
              ...text,
              x: left,
              y: top,
            };
          }
          return text;
        });

        updateTexts(newTexts);
      },
    }),
    [updateTexts, texts]
  );

  return (
    <Box
      width="full"
      height={height}
      ref={containerRef}
      backgroundImage={pictureUrl}
      backgroundColor="gray.100"
      backgroundPosition="center"
      backgroundRepeat="no-repeat"
      backgroundSize="contain"
      overflow="hidden"
      position="relative"
      borderRadius={8}
      data-testid={dataTestId}
    >
       <div
        ref={drop}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {texts.map((text, index) => (
          <MemeText
            key={keygen()}
            id={index.toString()}
            left={text.x}
            top={text.y}
            dataTestId={dataTestId}
            canDrag={dragableTexts}
            number={index}
          >
            <Text fontSize={fontSize} style={{ WebkitTextStroke: "1px black" }}>
              {text.content}
            </Text>
          </MemeText>
        ))}
      </div>
    </Box>
  );
};
