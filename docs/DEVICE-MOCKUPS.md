# Device mockups

Nine code-rendered device frames are shared by motions and screen recording demos: iPhone Pro (titanium), iPhone (midnight), Galaxy Ultra (titanium), Galaxy (graphite), MacBook Pro, MacBook Air, iMac, PC laptop and PC monitor. These are stylized hardware frames, not photographic assets.

In motion creation, select the device in the screens/assets step. The selection is stored in the initial project version while generation is pending, then retained in the generated graph. In the editor, select a screens scene and open its mockup settings. Device choice applies to all screens and creates a version without an AI call. AI edits, version restoration and project duplication retain the choice.

For recordings, select a device in Mise en scène during creation or editing. It replaces the browser frame; returning to no device restores the saved browser/radius settings. Device frames follow the existing per-zoom 3D animation. Capture aspect ratio is preserved; incompatible capture and device ratios produce letterboxing.

`config/device-mockups.ts` owns the catalog and geometry. `DeviceShell` renders the same hardware for previews and exports. Focus coordinates and recording pointer targeting use the actual contained source rectangle, excluding the shell and any letterboxing.

No database migration or new storage assets are required. Deploy the app and run `npm.cmd run video:deploy` to update the Remotion rendering site before exporting with the new frames.

Validation: `node --import tsx --conditions=react-server --test lib/recordings/device-mockups.test.ts` covers every model with portrait, landscape and square containers, aspect preservation, pointer coordinates and setting validation.
