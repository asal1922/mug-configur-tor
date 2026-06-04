import Model from "./Model";

export default function Experience({
    selectedPart,
    setSelectedPart,
    colors,
    labelText,
    fontFamily,
    textColor,
    uploadedImage,
}) {
    return (
        <Model
            selectedPart={selectedPart}
            setSelectedPart={setSelectedPart}
            colors={colors}
            labelText={labelText}
            fontFamily={fontFamily}
            textColor={textColor}
            uploadedImage={uploadedImage}
        />
    );
}