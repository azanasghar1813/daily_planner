import mongoose from 'mongoose';
export declare const Task: mongoose.Model<{
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    date: string;
    title: string;
    description?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    date: string;
    title: string;
    description?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}> & {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    date: string;
    title: string;
    description?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}, {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    date: string;
    title: string;
    description?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    date: string;
    title: string;
    description?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
}, {}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}> & {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    date: string;
    title: string;
    description?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, unknown, {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    date: string;
    title: string;
    description?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    date: string;
    title: string;
    description?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export declare const TaskDetail: mongoose.Model<{
    [x: string]: NativeDate;
    id: string;
    task_id: string;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    id: string;
    task_id: string;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}> & {
    [x: string]: NativeDate;
    id: string;
    task_id: string;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}, {
    [x: string]: NativeDate;
    id: string;
    task_id: string;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    id: string;
    task_id: string;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
}, {}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}> & {
    [x: string]: NativeDate;
    id: string;
    task_id: string;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, unknown, {
    [x: string]: NativeDate;
    id: string;
    task_id: string;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    [x: string]: NativeDate;
    id: string;
    task_id: string;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    completed: boolean;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export declare const Note: mongoose.Model<{
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    title: string;
    content?: string | null;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    title: string;
    content?: string | null;
}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}> & {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    title: string;
    content?: string | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}, {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    title: string;
    content?: string | null;
}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    title: string;
    content?: string | null;
}, {}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}> & {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    title: string;
    content?: string | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, unknown, {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    title: string;
    content?: string | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    [x: string]: NativeDate;
    id: string;
    user_id: string;
    title: string;
    content?: string | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=models.d.ts.map