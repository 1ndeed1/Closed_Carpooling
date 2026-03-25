import csv
import os

input_file = "kerala_traffic_data.csv"
output_file = "kerala_traffic_data_clean.csv"

# Count fields from header
header = None
rows = 0

if os.path.exists(input_file):
    with open(input_file, 'r', newline='') as inf, open(output_file, 'w', newline='') as outf:
        reader = csv.reader(inf)
        writer = csv.writer(outf)
        
        try:
            header = next(reader)
            writer.writerow(header)
            num_fields = len(header)
            
            for row in reader:
                if len(row) == num_fields:
                    writer.writerow(row)
                    rows += 1
        except Exception as e:
            print(f"Error parsing at row {rows}: {e}")

    os.replace(output_file, input_file)
    print(f"Sanitization complete. Kept {rows} valid rows out of many.")
else:
    print("Input file not found.")
