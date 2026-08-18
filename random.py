import tkinter as tk
from tkinter import ttk, messagebox, filedialog, simpledialog
import random
import json
import re
from collections import OrderedDict
import time
import threading

class WeightedRandomNumberApp:
    def __init__(self, root):
        self.root = root
        self.root.title("加权随机数生成器 v1.0")
        
        # 获取屏幕尺寸
        self.screen_width = root.winfo_screenwidth()
        self.screen_height = root.winfo_screenheight()
        
        # 设置窗口大小为屏幕的80%
        self.window_width = int(self.screen_width * 0.8)
        self.window_height = int(self.screen_height * 0.8)
        self.root.geometry(f"{self.window_width}x{self.window_height}")
        
        # 设置最小窗口大小
        self.root.minsize(1000, 700)
        
        # 存储随机数和权重 {数字: 权重}
        self.weighted_numbers = OrderedDict()
        
        # 设置样式
        self.setup_styles()
        
        # 创建GUI组件
        self.create_widgets()
        
        # 初始化一些示例数据
        self.initialize_sample_data()
        
        # 动画相关变量
        self.is_animating = False
        self.selected_number = None
        self.animation_thread = None

    def setup_styles(self):
        """设置界面样式"""
        style = ttk.Style()
        style.configure("Title.TLabel", font=("微软雅黑", 16, "bold"))
        style.configure("Header.TLabel", font=("微软雅黑", 12, "bold"))
        style.configure("Normal.TButton", font=("微软雅黑", 10))
        style.configure("Large.TButton", font=("微软雅黑", 12, "bold"))

    def create_widgets(self):
        """创建所有GUI组件"""
        # 创建主框架
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 创建顶部标题
        title_label = ttk.Label(main_frame, text="加权随机数生成器", style="Title.TLabel")
        title_label.pack(pady=(0, 10))
        
        # 创建左右分栏的主容器
        paned_window = ttk.PanedWindow(main_frame, orient=tk.HORIZONTAL)
        paned_window.pack(fill=tk.BOTH, expand=True)
        
        # 左侧：数字列表区域
        left_frame = ttk.LabelFrame(paned_window, text="随机数列表", padding="10")
        paned_window.add(left_frame, weight=1)
        
        # 数字列表树状图
        columns = ("数字", "权重", "概率")
        self.tree = ttk.Treeview(left_frame, columns=columns, show="headings", height=20)
        
        # 设置列宽
        self.tree.heading("数字", text="数字")
        self.tree.heading("权重", text="权重")
        self.tree.heading("概率", text="概率")
        
        self.tree.column("数字", width=80, anchor=tk.CENTER)
        self.tree.column("权重", width=80, anchor=tk.CENTER)
        self.tree.column("概率", width=100, anchor=tk.CENTER)
        
        # 添加滚动条
        tree_scrollbar = ttk.Scrollbar(left_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=tree_scrollbar.set)
        
        # 布局树状图和滚动条
        self.tree.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        tree_scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        
        # 绑定双击事件
        self.tree.bind("<Double-1>", self.on_double_click)
        
        # 配置左侧框架网格
        left_frame.columnconfigure(0, weight=1)
        left_frame.rowconfigure(0, weight=1)
        
        # 右侧：控制面板区域
        right_frame = ttk.Frame(paned_window)
        paned_window.add(right_frame, weight=1)
        
        # 在右侧框架内创建滚动条
        right_canvas = tk.Canvas(right_frame)
        right_scrollbar = ttk.Scrollbar(right_frame, orient=tk.VERTICAL, command=right_canvas.yview)
        scrollable_frame = ttk.Frame(right_canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: right_canvas.configure(scrollregion=right_canvas.bbox("all"))
        )
        
        right_canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        right_canvas.configure(yscrollcommand=right_scrollbar.set)
        
        # 布局右侧滚动区域
        right_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        right_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # 创建控制面板内容
        self.create_control_panel(scrollable_frame)
        
        # 底部：信息显示区域
        info_frame = ttk.LabelFrame(main_frame, text="统计信息", padding="10")
        info_frame.pack(fill=tk.X, pady=(10, 0))
        
        self.info_label = ttk.Label(info_frame, text="总数: 0 | 总权重: 0 | 平均概率: 0%")
        self.info_label.pack(anchor=tk.W)
        
        # 设置PanedWindow的初始分割比例
        paned_window.sashpos(0, int(self.window_width * 0.4))

    def create_control_panel(self, parent_frame):
        """创建控制面板内容"""
        # 一、编辑随机数范围
        edit_frame = ttk.LabelFrame(parent_frame, text="一、编辑随机数范围", padding="10")
        edit_frame.pack(fill=tk.X, pady=(0, 10))
        
        # 添加单个随机数
        single_frame = ttk.Frame(edit_frame)
        single_frame.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(single_frame, text="添加单个随机数:").pack(side=tk.LEFT, padx=(0, 5))
        self.single_num_entry = ttk.Entry(single_frame, width=15)
        self.single_num_entry.pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(single_frame, text="添加", command=self.add_single_number,
                  style="Normal.TButton").pack(side=tk.LEFT)
        
        # 删除单个随机数
        delete_frame = ttk.Frame(edit_frame)
        delete_frame.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(delete_frame, text="删除单个随机数:").pack(side=tk.LEFT, padx=(0, 5))
        self.del_num_entry = ttk.Entry(delete_frame, width=15)
        self.del_num_entry.pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(delete_frame, text="删除", command=self.delete_single_number,
                  style="Normal.TButton").pack(side=tk.LEFT)
        
        # 批量添加随机数
        batch_frame = ttk.Frame(edit_frame)
        batch_frame.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(batch_frame, text="批量添加随机数:").pack(side=tk.LEFT, padx=(0, 5))
        self.batch_start_entry = ttk.Entry(batch_frame, width=8)
        self.batch_start_entry.pack(side=tk.LEFT, padx=(0, 2))
        ttk.Label(batch_frame, text="到").pack(side=tk.LEFT, padx=2)
        self.batch_end_entry = ttk.Entry(batch_frame, width=8)
        self.batch_end_entry.pack(side=tk.LEFT, padx=(2, 5))
        ttk.Button(batch_frame, text="添加区间", command=self.add_batch_range,
                  style="Normal.TButton").pack(side=tk.LEFT)
        
        # 正则表达式批量添加
        regex_frame = ttk.Frame(edit_frame)
        regex_frame.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(regex_frame, text="正则表达式:").pack(side=tk.LEFT, padx=(0, 5))
        self.regex_entry = ttk.Entry(regex_frame, width=25)
        self.regex_entry.pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(regex_frame, text="正则添加", command=self.add_by_regex,
                  style="Normal.TButton").pack(side=tk.LEFT)
        
        # 批量删除选项
        batch_del_frame = ttk.Frame(edit_frame)
        batch_del_frame.pack(fill=tk.X)
        
        ttk.Label(batch_del_frame, text="批量删除:").pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(batch_del_frame, text="多选删除", command=self.delete_multiple,
                  style="Normal.TButton").pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(batch_del_frame, text="区间删除", command=self.delete_range,
                  style="Normal.TButton").pack(side=tk.LEFT)
        
        # 二、编辑权重
        weight_frame = ttk.LabelFrame(parent_frame, text="二、编辑权重", padding="10")
        weight_frame.pack(fill=tk.X, pady=(0, 10))
        
        # 编辑单个权重
        edit_weight_frame = ttk.Frame(weight_frame)
        edit_weight_frame.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(edit_weight_frame, text="编辑单个权重:").pack(side=tk.LEFT, padx=(0, 5))
        ttk.Label(edit_weight_frame, text="数字:").pack(side=tk.LEFT, padx=(0, 2))
        self.edit_num_entry = ttk.Entry(edit_weight_frame, width=10)
        self.edit_num_entry.pack(side=tk.LEFT, padx=(0, 5))
        ttk.Label(edit_weight_frame, text="权重:").pack(side=tk.LEFT, padx=(0, 2))
        self.edit_weight_entry = ttk.Entry(edit_weight_frame, width=10)
        self.edit_weight_entry.pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(edit_weight_frame, text="设置权重", command=self.edit_single_weight,
                  style="Normal.TButton").pack(side=tk.LEFT)
        
        # 批量编辑权重
        batch_weight_frame = ttk.Frame(weight_frame)
        batch_weight_frame.pack(fill=tk.X)
        
        ttk.Label(batch_weight_frame, text="批量编辑权重:").pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(batch_weight_frame, text="多选编辑", command=self.edit_multiple_weights,
                  style="Normal.TButton").pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(batch_weight_frame, text="统一权重", command=self.set_uniform_weights,
                  style="Normal.TButton").pack(side=tk.LEFT)
        
        # 三、生成随机数
        generate_frame = ttk.LabelFrame(parent_frame, text="三、生成随机数", padding="10")
        generate_frame.pack(fill=tk.X, pady=(0, 10))
        
        # 结果显示区域
        display_frame = ttk.Frame(generate_frame)
        display_frame.pack(pady=(0, 10))
        
        self.result_display = tk.Text(display_frame, height=3, width=25, 
                                     font=("Arial", 28, "bold"), bg="black", fg="white",
                                     relief=tk.RIDGE, bd=3)
        self.result_display.pack()
        self.result_display.tag_configure("center", justify='center')
        
        # 控制按钮
        button_frame = ttk.Frame(generate_frame)
        button_frame.pack()
        
        ttk.Button(button_frame, text="开始生成", command=self.start_generation,
                  style="Large.TButton").pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(button_frame, text="停止", command=self.stop_generation,
                  style="Large.TButton").pack(side=tk.LEFT, padx=5, pady=5)
        self.status_label = ttk.Label(button_frame, text="就绪", font=("微软雅黑", 10))
        self.status_label.pack(side=tk.LEFT, padx=20)
        
        # 四、配置管理
        config_frame = ttk.LabelFrame(parent_frame, text="四、配置管理", padding="10")
        config_frame.pack(fill=tk.X)
        
        config_button_frame = ttk.Frame(config_frame)
        config_button_frame.pack()
        
        ttk.Button(config_button_frame, text="导入配置", command=self.import_config,
                  style="Normal.TButton").pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(config_button_frame, text="导出配置", command=self.export_config,
                  style="Normal.TButton").pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(config_button_frame, text="清空所有", command=self.clear_all,
                  style="Normal.TButton").pack(side=tk.LEFT, padx=5, pady=5)

    def initialize_sample_data(self):
        """初始化示例数据"""
        sample_data = {
            1: 10,
            2: 20,
            3: 30,
            4: 15,
            5: 25,
            6: 5,
            7: 40,
            8: 10,
            9: 20,
            10: 15
        }
        for num, weight in sample_data.items():
            self.weighted_numbers[num] = weight
        self.update_display()

    def update_display(self):
        """更新数字列表显示"""
        # 清空树状图
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # 计算总权重
        total_weight = sum(self.weighted_numbers.values())
        
        # 添加数据到树状图
        for num, weight in self.weighted_numbers.items():
            probability = (weight / total_weight * 100) if total_weight > 0 else 0
            self.tree.insert("", tk.END, values=(num, weight, f"{probability:.2f}%"))
        
        # 更新统计信息
        count = len(self.weighted_numbers)
        avg_prob = 100 / count if count > 0 else 0
        self.info_label.config(
            text=f"总数: {count} | 总权重: {total_weight} | 平均概率: {avg_prob:.2f}%"
        )

    def add_single_number(self):
        """添加单个随机数"""
        try:
            num = int(self.single_num_entry.get())
            weight = simpledialog.askinteger("设置权重", f"请输入数字 {num} 的权重:", 
                                           initialvalue=1, minvalue=1)
            if weight is not None:
                self.weighted_numbers[num] = weight
                self.update_display()
                self.single_num_entry.delete(0, tk.END)
        except ValueError:
            messagebox.showerror("错误", "请输入有效的整数！")

    def delete_single_number(self):
        """删除单个随机数"""
        try:
            num = int(self.del_num_entry.get())
            if num in self.weighted_numbers:
                del self.weighted_numbers[num]
                self.update_display()
            else:
                messagebox.showwarning("提示", f"数字 {num} 不存在！")
            self.del_num_entry.delete(0, tk.END)
        except ValueError:
            messagebox.showerror("错误", "请输入有效的整数！")

    def add_batch_range(self):
        """批量添加区间内的随机数"""
        try:
            start = int(self.batch_start_entry.get())
            end = int(self.batch_end_entry.get())
            
            if start > end:
                start, end = end, start
            
            weight = simpledialog.askinteger("设置权重", "请输入批量添加的权重:", 
                                           initialvalue=1, minvalue=1)
            if weight is not None:
                for num in range(start, end + 1):
                    self.weighted_numbers[num] = weight
                
                self.update_display()
                self.batch_start_entry.delete(0, tk.END)
                self.batch_end_entry.delete(0, tk.END)
                messagebox.showinfo("成功", f"已添加 {end - start + 1} 个数字")
        except ValueError:
            messagebox.showerror("错误", "请输入有效的整数区间！")

    def add_by_regex(self):
        """使用正则表达式批量添加"""
        pattern = self.regex_entry.get()
        if not pattern:
            messagebox.showerror("错误", "请输入正则表达式！")
            return
        
        try:
            weight = simpledialog.askinteger("设置权重", "请输入批量添加的权重:", 
                                           initialvalue=1, minvalue=1)
            if weight is not None:
                # 示例：让用户输入要匹配的数字范围或模式
                numbers_str = simpledialog.askstring("输入数字", 
                                                   "请输入要添加的数字（用逗号分隔或使用1-10格式）:")
                if numbers_str:
                    numbers = []
                    for part in numbers_str.split(','):
                        part = part.strip()
                        if '-' in part:
                            try:
                                start, end = map(int, part.split('-'))
                                numbers.extend(range(start, end + 1))
                            except ValueError:
                                messagebox.showerror("错误", f"无效的区间格式: {part}")
                                return
                        else:
                            try:
                                numbers.append(int(part))
                            except ValueError:
                                messagebox.showerror("错误", f"无效的数字: {part}")
                                return
                    
                    for num in numbers:
                        self.weighted_numbers[num] = weight
                    
                    self.update_display()
                    self.regex_entry.delete(0, tk.END)
                    messagebox.showinfo("成功", f"已添加 {len(numbers)} 个数字")
        except Exception as e:
            messagebox.showerror("错误", f"错误: {str(e)}")

    def delete_multiple(self):
        """多选删除"""
        selected_items = self.tree.selection()
        if not selected_items:
            messagebox.showwarning("提示", "请先选择要删除的项目！")
            return
        
        # 确认删除
        if messagebox.askyesno("确认删除", f"确定要删除 {len(selected_items)} 个数字吗？"):
            numbers_to_delete = []
            for item in selected_items:
                values = self.tree.item(item, 'values')
                num = int(values[0])
                numbers_to_delete.append(num)
            
            for num in numbers_to_delete:
                if num in self.weighted_numbers:
                    del self.weighted_numbers[num]
            
            self.update_display()
            messagebox.showinfo("完成", f"已删除 {len(numbers_to_delete)} 个数字")

    def delete_range(self):
        """区间删除"""
        try:
            start = simpledialog.askinteger("区间起点", "请输入删除区间的起点:")
            end = simpledialog.askinteger("区间终点", "请输入删除区间的终点:")
            
            if start is not None and end is not None:
                if start > end:
                    start, end = end, start
                
                nums_to_delete = [num for num in list(self.weighted_numbers.keys()) 
                                if start <= num <= end]
                
                if nums_to_delete:
                    if messagebox.askyesno("确认删除", f"确定要删除区间 {start}-{end} 内的 {len(nums_to_delete)} 个数字吗？"):
                        for num in nums_to_delete:
                            del self.weighted_numbers[num]
                        self.update_display()
                        messagebox.showinfo("完成", f"已删除 {len(nums_to_delete)} 个数字")
                else:
                    messagebox.showinfo("提示", "该区间内没有数字")
        except ValueError:
            messagebox.showerror("错误", "请输入有效的整数！")

    def on_double_click(self, event):
        """双击编辑权重"""
        selection = self.tree.selection()
        if not selection:
            return
            
        item = selection[0]
        values = self.tree.item(item, 'values')
        num = int(values[0])
        
        new_weight = simpledialog.askinteger("编辑权重", f"请输入数字 {num} 的新权重:", 
                                           initialvalue=int(values[1]), minvalue=1)
        if new_weight is not None:
            self.weighted_numbers[num] = new_weight
            self.update_display()

    def edit_single_weight(self):
        """编辑单个权重"""
        try:
            num = int(self.edit_num_entry.get())
            weight = int(self.edit_weight_entry.get())
            
            if num in self.weighted_numbers:
                self.weighted_numbers[num] = weight
                self.update_display()
                self.edit_num_entry.delete(0, tk.END)
                self.edit_weight_entry.delete(0, tk.END)
                messagebox.showinfo("成功", f"已将数字 {num} 的权重设置为 {weight}")
            else:
                messagebox.showwarning("提示", f"数字 {num} 不存在！")
        except ValueError:
            messagebox.showerror("错误", "请输入有效的整数！")

    def edit_multiple_weights(self):
        """批量编辑权重"""
        selected_items = self.tree.selection()
        if not selected_items:
            messagebox.showwarning("提示", "请先选择要编辑的项目！")
            return
        
        new_weight = simpledialog.askinteger("批量设置权重", "请输入新的权重:", 
                                           initialvalue=1, minvalue=1)
        if new_weight is not None:
            count = 0
            for item in selected_items:
                values = self.tree.item(item, 'values')
                num = int(values[0])
                self.weighted_numbers[num] = new_weight
                count += 1
            
            self.update_display()
            messagebox.showinfo("成功", f"已为 {count} 个数字设置权重为 {new_weight}")

    def set_uniform_weights(self):
        """设置统一权重"""
        if not self.weighted_numbers:
            messagebox.showwarning("提示", "当前没有数字！")
            return
        
        new_weight = simpledialog.askinteger("统一权重", "请输入统一的权重:", 
                                           initialvalue=1, minvalue=1)
        if new_weight is not None:
            for num in self.weighted_numbers:
                self.weighted_numbers[num] = new_weight
            self.update_display()
            messagebox.showinfo("成功", f"已将全部 {len(self.weighted_numbers)} 个数字的权重设置为 {new_weight}")

    def start_generation(self):
        """开始生成随机数"""
        if not self.weighted_numbers:
            messagebox.showwarning("提示", "请先添加随机数！")
            return
        
        # 停止之前的动画
        if self.is_animating:
            self.stop_generation()
        
        # 根据权重选择随机数
        numbers = list(self.weighted_numbers.keys())
        weights = list(self.weighted_numbers.values())
        self.selected_number = random.choices(numbers, weights=weights, k=1)[0]
        
        # 开始动画
        self.is_animating = True
        self.status_label.config(text="生成中...")
        self.animation_thread = threading.Thread(target=self.run_animation)
        self.animation_thread.daemon = True
        self.animation_thread.start()

    def run_animation(self):
        """运行动画效果"""
        start_time = time.time()
        numbers = list(self.weighted_numbers.keys())
        
        while self.is_animating and (time.time() - start_time) < 5:
            # 随机显示一个数字
            random_num = random.choice(numbers)
            self.root.after(0, self.update_display_text, str(random_num))
            time.sleep(0.05)  # 控制闪动速度
        
        # 显示最终结果
        if self.is_animating:
            self.root.after(0, self.show_final_result)

    def update_display_text(self, text):
        """更新显示文本"""
        self.result_display.delete(1.0, tk.END)
        self.result_display.insert(1.0, text, "center")

    def show_final_result(self):
        """显示最终结果"""
        if self.selected_number is not None:
            self.result_display.delete(1.0, tk.END)
            self.result_display.insert(1.0, str(self.selected_number), "center")
            self.status_label.config(text=f"已选择: {self.selected_number}")
        
        self.is_animating = False

    def stop_generation(self):
        """停止生成"""
        self.is_animating = False
        if self.selected_number is not None:
            self.show_final_result()

    def import_config(self):
        """导入配置"""
        file_path = filedialog.askopenfilename(
            title="选择配置文件",
            filetypes=[("JSON文件", "*.json"), ("所有文件", "*.*")]
        )
        
        if file_path:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if isinstance(data, dict):
                    self.weighted_numbers = OrderedDict(
                        sorted({int(k): v for k, v in data.items()}.items())
                    )
                    self.update_display()
                    messagebox.showinfo("成功", "配置导入成功！")
                else:
                    messagebox.showerror("错误", "配置文件格式不正确！")
            except Exception as e:
                messagebox.showerror("错误", f"导入失败: {str(e)}")

    def export_config(self):
        """导出配置"""
        if not self.weighted_numbers:
            messagebox.showwarning("提示", "当前没有数据可以导出！")
            return
        
        file_path = filedialog.asksaveasfilename(
            title="保存配置文件",
            defaultextension=".json",
            filetypes=[("JSON文件", "*.json"), ("所有文件", "*.*")]
        )
        
        if file_path:
            try:
                data = {str(k): v for k, v in self.weighted_numbers.items()}
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                messagebox.showinfo("成功", f"配置已导出到: {file_path}")
            except Exception as e:
                messagebox.showerror("错误", f"导出失败: {str(e)}")

    def clear_all(self):
        """清空所有数据"""
        if messagebox.askyesno("确认", "确定要清空所有数据吗？"):
            self.weighted_numbers.clear()
            self.update_display()
            messagebox.showinfo("成功", "已清空所有数据")

def main():
    root = tk.Tk()
    app = WeightedRandomNumberApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()