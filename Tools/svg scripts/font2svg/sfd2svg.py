#!/usr/bin/env python3
"""
sfd2svg.py - Convert FontForge SFD font glyphs to individual SVG files.

Usage:
  fontforge -script sfd2svg.py [input.sfd] [output_folder]

Examples:
  fontforge -script sfd2svg.py test.sfd testicons
  fontforge -script sfd2svg.py   # uses defaults: test.sfd -> testicons/

Requirements:
  - FontForge with Python scripting support
  - Install FontForge from https://fontforge.org/
"""

import sys
import os
import re
import xml.etree.ElementTree as ET

# FontForge module is available when running via `fontforge -script`
try:
    import fontforge
except ImportError:
    print("ERROR: This script must be run with FontForge:")
    print("  fontforge -script sfd2svg.py [input.sfd] [output_folder]")
    sys.exit(1)


def sfd_to_svg(sfd_path, output_folder):
    """
    Open an SFD font file and export each glyph with outlines as an SVG.
    
    Args:
        sfd_path: Path to the .sfd font file
        output_folder: Directory to save SVG files
    """
    # Resolve paths relative to script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    if not os.path.isabs(sfd_path):
        sfd_path = os.path.join(script_dir, sfd_path)
    if not os.path.isabs(output_folder):
        output_folder = os.path.join(script_dir, output_folder)
    
    # Validate input file
    if not os.path.exists(sfd_path):
        print(f"ERROR: Font file not found: {sfd_path}")
        sys.exit(1)
    
    # Create output folder if needed
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        print(f"Created output folder: {output_folder}")
    
    # Open the font
    print(f"\nOpening font: {sfd_path}")
    font = fontforge.open(sfd_path)
    print(f"Font: {font.fontname} | Glyphs: {len(list(font.glyphs()))}")
    print("-" * 50)
    
    exported_count = 0
    skipped_count = 0
    
    # Iterate over all glyphs
    for glyph in font.glyphs():
        # Skip glyphs without outlines (empty glyphs)
        if glyph.foreground.isEmpty():
            skipped_count += 1
            continue
        
        # Generate a safe filename from glyph name
        glyph_name = glyph.glyphname
        # Replace problematic characters
        safe_name = glyph_name.replace("/", "_").replace("\\", "_").replace(":", "_")
        svg_filename = f"{safe_name}.svg"
        svg_path = os.path.join(output_folder, svg_filename)
        
        # Export glyph to SVG
        try:
            # Try to get glyph bbox from FontForge (font units)
            try:
                gbbox = glyph.boundingBox()
            except Exception:
                gbbox = None

            glyph.export(svg_path)
            exported_count += 1
            print(f"[OK] Exported: {svg_filename}")

            # Normalize the exported SVG (ensure viewBox, remove width/height,
            # add accessibility attributes, and prefix ids to avoid collisions)
            try:
                normalize_svg(svg_path, gbbox)
                print(f"[OK] Normalized: {svg_filename}")
            except Exception as e:
                print(f"[WARN] Normalization failed for {svg_filename}: {e}")
        except Exception as e:
            print(f"[ERROR] Failed to export {glyph_name}: {e}")
    
    # Summary
    print("-" * 50)
    print(f"Done! Exported {exported_count} glyphs to: {output_folder}")
    if skipped_count > 0:
        print(f"Skipped {skipped_count} empty glyphs (no outlines)")
    print()


def main():
    # Default values
    default_sfd = "test.sfd"
    default_output = "testicons"
    
    # Parse command line arguments
    if len(sys.argv) >= 3:
        sfd_path = sys.argv[1]
        output_folder = sys.argv[2]
    elif len(sys.argv) == 2:
        sfd_path = sys.argv[1]
        output_folder = default_output
    else:
        sfd_path = default_sfd
        output_folder = default_output
    
    print("=" * 50)
    print("SFD to SVG Converter")
    print("=" * 50)
    
    sfd_to_svg(sfd_path, output_folder)


def normalize_svg(svg_path, font_bbox=None):
    """Basic SVG normalization:
    - Ensure `viewBox` exists (derive from width/height if needed)
    - Remove `width` and `height` attributes so icons are scalable
    - Add `role="img"` and `focusable="false"` and `preserveAspectRatio`
    - Prefix any `id` attributes with a file-specific prefix and update references
    """
    tree = ET.parse(svg_path)
    root = tree.getroot()

    # Namespace handling
    SVG_NS = 'http://www.w3.org/2000/svg'
    if not root.tag.startswith('{'):
        # ensure the svg has the SVG namespace
        root.set('xmlns', SVG_NS)

    # derive a safe prefix from filename
    filename = os.path.splitext(os.path.basename(svg_path))[0]
    prefix = re.sub(r"[^A-Za-z0-9_-]", "_", filename)

    # Add accessibility and preserveAspectRatio attributes
    if 'role' not in root.attrib:
        root.set('role', 'img')
    if 'focusable' not in root.attrib:
        root.set('focusable', 'false')
    if 'preserveAspectRatio' not in root.attrib:
        root.set('preserveAspectRatio', 'xMidYMid meet')

    # If font_bbox provided (from FontForge), use it to set the viewBox
    if font_bbox and len(font_bbox) == 4:
        # FontForge bbox is (xmin, ymin, xmax, ymax)
        try:
            xmin, ymin, xmax, ymax = font_bbox
            xmin = float(xmin)
            ymin = float(ymin)
            xmax = float(xmax)
            ymax = float(ymax)
            gw = xmax - xmin
            gh = ymax - ymin
            # make a square viewBox so glyphs are visually centered
            size = max(gw, gh)
            if size <= 0:
                # fallback to width/height handling below
                pass
            else:
                cx = (xmin + xmax) / 2.0
                cy = (ymin + ymax) / 2.0
                vx = cx - size / 2.0
                vy = cy - size / 2.0
                root.set('viewBox', f"{vx} {vy} {size} {size}")
        except Exception:
            pass
    else:
        # If viewBox missing, try to derive from width/height
        if 'viewBox' not in root.attrib:
            w = root.attrib.get('width')
            h = root.attrib.get('height')
            if w and h:
                m_w = re.search(r"([0-9]+(?:\.[0-9]+)?)", w)
                m_h = re.search(r"([0-9]+(?:\.[0-9]+)?)", h)
                if m_w and m_h:
                    vw = m_w.group(1)
                    vh = m_h.group(1)
                    root.set('viewBox', f"0 0 {vw} {vh}")

    # Remove width/height to make scalable
    if 'width' in root.attrib:
        del root.attrib['width']
    if 'height' in root.attrib:
        del root.attrib['height']

    # Prefix ids and update references
    # Build map of old_id -> new_id
    id_map = {}
    for elem in root.iter():
        eid = elem.attrib.get('id')
        if eid:
            new_id = f"{prefix}_{eid}"
            id_map[eid] = new_id
            elem.set('id', new_id)

    # Attributes that may reference ids via url(#id) or just #id
    url_re = re.compile(r"url\(#([^\)]+)\)")
    for elem in root.iter():
        for a, v in list(elem.attrib.items()):
            new_v = v
            # url(#id) references
            def repl(m):
                old = m.group(1)
                return f"url(#{id_map.get(old, old)})"
            new_v = url_re.sub(repl, new_v)
            # direct id references like "#id"
            if new_v.startswith('#'):
                old = new_v[1:]
                if old in id_map:
                    new_v = '#' + id_map[old]
            if new_v != v:
                elem.set(a, new_v)

    # Remove <metadata> elements if present
    for meta in list(root.findall('{%s}metadata' % SVG_NS)):
        root.remove(meta)

    # Write back (preserve unicode)
    tree.write(svg_path, encoding='utf-8', xml_declaration=True)


if __name__ == "__main__":
    main()
