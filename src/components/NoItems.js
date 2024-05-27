import React from "react";
import { Logos } from "./Logos";

export const NotFound = ({ name }) => {
    const noImages = (
        <>
            <div id="logoContainer">
                <Logos logo='no_images' />
            </div>
            <div id="text-container">hmmmmmm.... We couldn't find any Image Info on this page</div>
        </>
    )
    const noFonts = (
        <>
            <div id="logoContainer">
                <Logos logo='fonts' />
            </div>
            <div id="text-container">hmmmmmm.... We couldn't find any Font Info on this page</div>
        </>
    )
    const noColors = (
        <>
            <div id="logoContainer">
                <Logos logo='colors' />
            </div>
            <div id="text-container">hmmmmmm.... We couldn't find any Colors on this page</div>
        </>
    )

    const getNoItems = (name) => {
        switch (name) {
            case 'images':
                return noImages;
            case 'fonts':
                return noFonts;
            case 'colors':
                return noColors;
            default:
                return null;
        }
    }

    return (
        <div className={`no-items-container`}>
            {getNoItems(name)}
        </div>
    )
};