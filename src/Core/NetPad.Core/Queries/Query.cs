﻿using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using NetPad.Common;
using NetPad.Exceptions;

namespace NetPad.Queries
{
    public class Query : INotifyOnPropertyChanged
    {
        private bool _isDirty = false;
        private string _name;

        public Query(Guid id, string name)
        {
            Id = id;
            _name = name;
            Config = new QueryConfig(QueryKind.Statements, new List<string>());
            Code = string.Empty;
            OnPropertyChanged = new List<Func<PropertyChangedArgs, Task>>();
        }

        public Query(string name) : this(Guid.NewGuid(), name)
        {
        }

        [JsonIgnore]
        public List<Func<PropertyChangedArgs, Task>> OnPropertyChanged { get; }

        public Guid Id { get; private set; }

        public string Name
        {
            get => _name;
            set => this.RaiseAndSetIfChanged(ref _name, value);
        }

        public string? FilePath { get; private set; }
        public QueryConfig Config { get; private set; }
        public string Code { get; private set; }

        public string? DirectoryPath => FilePath == null ? null : Path.GetDirectoryName(FilePath);

        public bool IsDirty
        {
            get => _isDirty || IsNew;
            set => this.RaiseAndSetIfChanged(ref _isDirty, value);
        }

        public bool IsNew => FilePath == null;


        public async Task LoadAsync()
        {
            if (FilePath == null)
                throw new InvalidOperationException($"FilePath: '{FilePath}' is null. Cannot load query.");

            var text = await File.ReadAllTextAsync(FilePath).ConfigureAwait(false);

            var parts = text.Split("#Query");
            if (parts.Length != 2)
                throw new InvalidQueryFormat(FilePath);

            var part1 = parts[0];
            var part1Lines = part1.Split(Environment.NewLine);
            var part2 = parts[1];

            Id = Guid.Parse(part1Lines.First());
            Name = Path.GetFileNameWithoutExtension(FilePath);
            Config = JsonSerializer.Deserialize<QueryConfig>(
                string.Join(Environment.NewLine, part1Lines.Skip(1))) ?? throw new InvalidQueryFormat(FilePath);
            Code = part2.TrimStart();
        }

        public async Task SaveAsync()
        {
            if (FilePath == null)
                throw new InvalidOperationException($"{FilePath} is null. Cannot save query.");

            var config = JsonSerializer.Serialize(Config);

            await File.WriteAllTextAsync(FilePath, $"{Id}\n" +
                                                   $"{config}\n" +
                                                   $"#Query\n" +
                                                   $"{Code}")
                .ConfigureAwait(false);
            IsDirty = false;
        }

        public void SetFilePath(string filePath)
        {
            FilePath = filePath ?? throw new ArgumentNullException(nameof(filePath));

            FilePath = filePath;
            Name = Path.GetFileNameWithoutExtension(filePath);
        }

        public void UpdateCode(string newCode)
        {
            Code = newCode ?? string.Empty;
            IsDirty = true;
        }

        public async Task GetRunnableCodeAsync()
        {
            var defaultNs = new[]
            {
                "System",
                "System.IO",
                "System.Collections",
                "System.Collections.Generic",
                "System.Linq",
                "System.Text",
                "System.Threading.Tasks",
            };

            var code = new StringBuilder();

            foreach (var ns in defaultNs.Union(Config.Namespaces).Distinct())
            {
                code.AppendLine($"using {ns};");
            }

            // Namespace
            code.AppendLine("namespace QueryRuntime");
            code.AppendLine("{");

            // Class
            code.AppendLine("public class Program");
            code.AppendLine("{");

            // Properties
            code.AppendLine("public Exception? Exception { get; }");

            // Main method
            code.AppendLine("public async Task Main()");
            code.AppendLine("{");


            code.AppendLine("try");
            code.AppendLine("{");

            code.AppendLine(Code);

            code.AppendLine("}");
            code.AppendLine("catch (Exception ex)");
            code.AppendLine("{");
            code.AppendLine("this.Exception = ex;");
            code.AppendLine("}");


            code.AppendLine("}"); // Main method
            code.AppendLine("}"); // Class
            code.AppendLine("}"); // Namespace
        }
    }
}