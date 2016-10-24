# HI-export-viewer
Simple Viewer for HyperImage (http://hyperimage.ws) XML exports

## Installation
HI-export-viewer at the moment needs Apache for fetching the project-directory contents. Be sure to have an .htaccess file with ```Options +Indexes``` in the projects dir.

 - Install node.js on your machine (https://docs.npmjs.com/getting-started/installing-node).
 - Install the node packages (i.e. bower)
	```
	npm install --production
	```
 - Install bower packages
	```
	bower install
	```

## Options
Some basic options can be defined in main.js:

```JavaScript
options{
	projectFilesDir: "projects/",
	showLangFlags: false,
	initialAnnoPopupPos: {x: 600, y: 200},
	initialImageOpacity: 0.5,
	imageOpacityStep: 0.01,
	cssSkeletonRandomColors: true
}
```
 * `projectFilesDir`: pointing to the Hyperimage project exports
 * `showLangFlags`: display flags instead of plain the annotation's {xml:lang} string. If set to 'true' the xml:lang-string will be used as key getting the [ISO 3166-1-alpha-2 code](http://www.iso.org/iso/country_names_and_code_elements) set in the langCodeMap map in lib/lang.js (using [flag-icon-css](https://github.com/lipis/flag-icon-css))
 * `initialAnnoPopupPos`: x and y screen coordinates for displaying the anno popup the first time
 * `initialImageOpacity`: initial opacity value for the underlying binary image
 * `imageOpacitySteps`: defines the opacity steps for the image opacity slider 
 * `cssSkeletonRandomColors`: if true, the generated css skeleton will include random svg fill color and toggle-button definitions for the tags
 
## Adding Hyperimage project data
copy the PeTAL folder to the directory defined in `options.projectFilesDir` and rename it. At the moment, the directory name is used as label. Be sure to have `Options +Indexes` enabled for the projects directory.