import os
import re
import xml.etree.ElementTree as ET

# Register namespaces to avoid ns0 prefixes
ET.register_namespace('', "http://www.w3.org/2000/svg")
ET.register_namespace('xlink', "http://www.w3.org/1999/xlink")

TARGET_DIR = r"c:\code\assets\Icons\TM_Icons"

def standardize_svg(file_path):
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Check if viewBox exists
        if 'viewBox' not in root.attrib:
            width = root.attrib.get('width')
            height = root.attrib.get('height')
            
            if width and height:
                # Remove 'px' or other units if present for viewBox
                w_val = re.sub(r'[^\d.]', '', width)
                h_val = re.sub(r'[^\d.]', '', height)
                
                root.attrib['viewBox'] = f"0 0 {w_val} {h_val}"
                print(f"Added viewBox to {os.path.basename(file_path)}")
            else:
                print(f"Skipping {os.path.basename(file_path)}: No width/height found and no viewBox")
                # Even if no width/height, we might want to clean up other things, but without viewBox it's risky to remove w/h if they existed but were empty? 
                # If they don't exist, we can't add viewBox.
                pass

        # Remove width and height attributes
        if 'width' in root.attrib:
            del root.attrib['width']
        if 'height' in root.attrib:
            del root.attrib['height']
            
        # Remove overflow
        if 'overflow' in root.attrib:
            del root.attrib['overflow']
            
        # Remove xml:space="preserve"
        # The attribute key in ElementTree for namespaced attributes usually includes the brace syntax
        # xml namespace is http://www.w3.org/XML/1998/namespace
        xml_ns = "{http://www.w3.org/XML/1998/namespace}"
        space_key = f"{xml_ns}space"
        
        if space_key in root.attrib:
            del root.attrib[space_key]
        
        # Also check for non-namespaced version just in case parser handled it differently
        if 'xml:space' in root.attrib:
            del root.attrib['xml:space']

        tree.write(file_path, encoding='utf-8', xml_declaration=True)
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    if not os.path.exists(TARGET_DIR):
        print(f"Directory not found: {TARGET_DIR}")
        return

    count = 0
    for filename in os.listdir(TARGET_DIR):
        if filename.lower().endswith('.svg'):
            file_path = os.path.join(TARGET_DIR, filename)
            standardize_svg(file_path)
            count += 1
            
    print(f"Processed {count} files.")

if __name__ == "__main__":
    main()
